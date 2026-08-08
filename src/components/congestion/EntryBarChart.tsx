// 入場・受付人数の棒グラフ（15分区間・積み上げ表示）＋教室混雑率の折れ線
import { useMemo, useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  Rectangle,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { LeftOutlined, RightOutlined } from "@ant-design/icons";
import type { OccupancyEntry, Ticket, YearSettings } from "@/types";
import { calcEntryCount } from "@/utils/calcFee";
import { shiftDateString } from "@/utils/format";
import { HourStepper } from "@/components/common/HourStepper";
import { DatePicker } from "@/components/common/DatePicker";

// dataviz パレット（CVD安全性・コントラスト検証済み）
const COLORS = {
  normal: "#2a78d6", // 通常系列（青）
  ticket: "#eb6834", // 整理券系列（オレンジ）
  congestion: "#0b0b0b", // 教室混雑率（柔らかい黒）
};

const BUCKET_MINUTES = 15;
const CONGESTION_WINDOW_MINUTES = 60;

type ChartMode = "entry" | "reception";

const MODE_LABELS: Record<ChartMode, { normal: string; ticket: string }> = {
  entry: { normal: "通常入場", ticket: "整理券入場" },
  reception: { normal: "通常受付", ticket: "整理券受付" },
};

interface BucketDatum {
  /** X軸ティック用ラベル（区間の開始時刻） */
  label: string;
  /** ツールチップ用の区間表示（hh:mm〜hh:mm） */
  rangeLabel: string;
  normal: number;
  ticket: number;
  /** 教室混雑率。終端境界のダミー点では折れ線を引かないため undefined */
  congestion?: number;
  /** 表示終了時刻をX軸に出すための境界ダミー点（棒・折れ線・ツールチップなし） */
  boundary?: boolean;
}

interface Props {
  date: string;
  onDateChange: (date: string) => void;
  minDate: string;
  maxDate: string;
  occupancyEntries: OccupancyEntry[];
  tickets: Ticket[];
  settings: YearSettings;
}

const formatMinutes = (totalMinutes: number) =>
  `${Math.floor(totalMinutes / 60)}:${String(totalMinutes % 60).padStart(2, "0")}`;

/** epoch ms → その日の 0:00 からの経過分（秒は分の小数として保持） */
const minutesOfDay = (epochMs: number) => {
  const d = new Date(epochMs);
  return d.getHours() * 60 + d.getMinutes() + d.getSeconds() / 60;
};

// ---- カスタムツールチップ ----------------------------------------------

interface TooltipItem {
  dataKey?: string | number;
  name?: string | number;
  value?: number | string;
  color?: string;
  payload?: BucketDatum;
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: readonly TooltipItem[];
}) {
  if (!active || !payload || payload.length === 0) return null;
  const bucket = payload[0]?.payload;
  // 終端境界のダミー点はデータを持たないためツールチップを出さない
  if (bucket?.boundary) return null;
  return (
    <div className="rounded-lg border border-neutral-200 bg-white px-3 py-2 shadow-sm">
      {bucket && (
        <p className="mb-1 text-[11px] font-medium text-neutral-500">
          {bucket.rangeLabel}
        </p>
      )}
      <div className="space-y-0.5">
        {payload.map((item) => (
          <div
            key={String(item.dataKey)}
            className="flex items-center gap-2 text-xs"
          >
            <span
              className="h-0.5 w-3 shrink-0 rounded-full"
              style={{ backgroundColor: item.color }}
            />
            <span className="text-neutral-500">{item.name}</span>
            <span className="ml-auto pl-3 font-semibold tabular-nums text-neutral-900">
              {item.dataKey === "congestion"
                ? `${item.value}%`
                : `${item.value}人`}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---- カスタム凡例（ツールチップと同じ line-key 表現） --------------------

interface LegendItem {
  value?: string | number;
  color?: string;
  dataKey?: string | number;
}

// 凡例の表示順（通常 → 整理券 → 教室混雑率）。
// recharts v3 は内部ストアの登録順で payload を組むため JSX の並び順が保証されず、
// カスタム凡例側で dataKey を基準に明示的に並べ替える
const LEGEND_ORDER: Record<string, number> = {
  normal: 0,
  ticket: 1,
  congestion: 2,
};

function ChartLegend({ payload }: { payload?: readonly LegendItem[] }) {
  if (!payload || payload.length === 0) return null;
  const sorted = [...payload].sort(
    (a, b) =>
      (LEGEND_ORDER[String(a.dataKey)] ?? payload.length) -
      (LEGEND_ORDER[String(b.dataKey)] ?? payload.length),
  );
  return (
    <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1">
      {sorted.map((item) => (
        <span
          key={String(item.value)}
          className="flex items-center gap-1.5 text-xs text-neutral-600"
        >
          <span
            className="h-0.5 w-4 rounded-full"
            style={{ backgroundColor: item.color }}
          />
          {item.value}
        </span>
      ))}
    </div>
  );
}

// ---- X軸カスタムティック --------------------------------------------------
//
// カテゴリ軸の既定ではラベルがバンド（バー）の中心に置かれ、「11:00」が
// 11:00〜11:15 のバーの真上に見えてしまう。ティックアイテムが持つ offset
// （バンド開始位置からの距離。recharts が外部利用向けに公開している値）を
// 差し引いて、ラベルと目盛り線を「区間の開始境界」に配置する。

interface BoundaryTickProps {
  x?: number;
  y?: number;
  payload?: { value?: string | number; offset?: number };
}

function BoundaryTick({ x = 0, y = 0, payload }: BoundaryTickProps) {
  const boundaryX = x - (payload?.offset ?? 0);
  return (
    <g>
      <line
        x1={boundaryX}
        x2={boundaryX}
        y1={y - 8}
        y2={y - 2}
        stroke="#9ca3af"
        strokeWidth={1}
      />
      <text
        x={boundaryX}
        y={y}
        dy={12}
        textAnchor="middle"
        fontSize={12}
        fill="#9ca3af"
      >
        {payload?.value}
      </text>
    </g>
  );
}

// ---- 本体 ---------------------------------------------------------------

export function EntryBarChart({
  date,
  onDateChange,
  minDate,
  maxDate,
  occupancyEntries,
  tickets,
  settings,
}: Props) {
  const [range, setRange] = useState(settings.chartHours);
  const [mode, setMode] = useState<ChartMode>("entry");

  const data = useMemo<BucketDatum[]>(() => {
    const startMin = range.start * 60;
    const endMin = range.end * 60;
    if (endMin <= startMin) return [];

    const bucketCount = Math.ceil((endMin - startMin) / BUCKET_MINUTES);
    const buckets: BucketDatum[] = Array.from(
      { length: bucketCount },
      (_, i) => {
        const s = startMin + i * BUCKET_MINUTES;
        const e = Math.min(s + BUCKET_MINUTES, endMin);
        return {
          label: formatMinutes(s),
          rangeLabel: `${formatMinutes(s)}〜${formatMinutes(e)}`,
          normal: 0,
          ticket: 0,
          congestion: 0,
        };
      },
    );

    const bucketIndex = (epochMs: number) =>
      Math.floor((minutesOfDay(epochMs) - startMin) / BUCKET_MINUTES);

    // 棒グラフ：通常系列（両モード共通で occupancyEntries の viaTicket === false）
    // 入場モードの整理券系列も occupancyEntries から集計する
    occupancyEntries.forEach((entry) => {
      const idx = bucketIndex(entry.entryTime);
      if (idx < 0 || idx >= bucketCount) return;
      if (!entry.viaTicket) buckets[idx].normal += entry.partySize;
      else if (mode === "entry") buckets[idx].ticket += entry.partySize;
    });

    // 受付モードの整理券系列：その日に配布された全整理券を createdAt で集計
    if (mode === "reception") {
      tickets.forEach((ticket) => {
        const idx = bucketIndex(ticket.createdAt);
        if (idx < 0 || idx >= bucketCount) return;
        buckets[idx].ticket += calcEntryCount(ticket.pendingData.feeLines);
      });
    }

    // 教室混雑率：各バケット終端Tの直近1時間の入場者数（viaTicket問わず）÷ 教室定員
    // モードに関わらず常に実際の入場実績（occupancyEntries）に基づく
    if (settings.roomCapacity > 0) {
      buckets.forEach((bucket, i) => {
        const tMin = Math.min(startMin + (i + 1) * BUCKET_MINUTES, endMin);
        const windowStart = tMin - CONGESTION_WINDOW_MINUTES;
        let count = 0;
        occupancyEntries.forEach((entry) => {
          const m = minutesOfDay(entry.entryTime);
          if (m > windowStart && m <= tMin) count += entry.partySize;
        });
        bucket.congestion = Math.round((count / settings.roomCapacity) * 100);
      });
    }

    // 終端境界のダミー点：バケットは [start, end) の半開区間で生成されるため、
    // 表示終了時刻そのもの（例: 20:00）のラベルを持つ点が存在しない。
    // X軸に終了時刻を表示するためだけの点を末尾に置く（normal/ticket は 0 で
    // 棒は描かれず、congestion は undefined のため折れ線もここへは伸びない）
    buckets.push({
      label: formatMinutes(endMin),
      rangeLabel: formatMinutes(endMin),
      normal: 0,
      ticket: 0,
      boundary: true,
    });

    return buckets;
  }, [occupancyEntries, tickets, range, mode, settings.roomCapacity]);

  // X軸は1時間ごとの主要ティック＋表示終了時刻の境界のみ表示
  const hourTicks = useMemo(
    () =>
      data
        .filter((d) => d.boundary || d.label.endsWith(":00"))
        .map((d) => d.label),
    [data],
  );

  const shiftDate = (days: number) => {
    const next = shiftDateString(date, days);
    if (next >= minDate && next <= maxDate) onDateChange(next);
  };

  const labels = MODE_LABELS[mode];

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="hidden min-[643px]:mb-4 min-[643px]:flex min-[643px]:flex-wrap min-[643px]:items-center min-[643px]:justify-between min-[643px]:gap-3">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDate(-1)}
            disabled={date <= minDate}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-30"
          >
            <LeftOutlined />
          </button>
          <DatePicker
            value={date}
            onChange={onDateChange}
            minDate={minDate}
            maxDate={maxDate}
            size={32}
          />
          <button
            onClick={() => shiftDate(1)}
            disabled={date >= maxDate}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-30"
          >
            <RightOutlined />
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2 text-sm text-neutral-500">
            表示時間
            <HourStepper
              value={range.start}
              onChange={(start) => setRange((r) => ({ ...r, start }))}
              label="表示開始時刻"
            />
            〜
            <HourStepper
              value={range.end}
              onChange={(end) => setRange((r) => ({ ...r, end }))}
              label="表示終了時刻"
            />
          </div>

          <div
            className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5"
            role="tablist"
          >
            {(
              [
                { value: "entry", label: "入場" },
                { value: "reception", label: "受付" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                role="tab"
                aria-selected={mode === option.value}
                onClick={() => setMode(option.value)}
                className={`rounded-md px-3 py-1 text-sm transition ${
                  mode === option.value
                    ? "bg-neutral-900 font-medium text-white"
                    : "text-neutral-500 hover:bg-neutral-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mb-4 hidden min-[414px]:max-[642px]:flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-2">
            <button
              onClick={() => shiftDate(-1)}
              disabled={date <= minDate}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-30"
            >
              <LeftOutlined />
            </button>
            <DatePicker
              value={date}
              onChange={onDateChange}
              minDate={minDate}
              maxDate={maxDate}
              size={32}
            />
            <button
              onClick={() => shiftDate(1)}
              disabled={date >= maxDate}
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-30"
            >
              <RightOutlined />
            </button>
          </div>

          <div
            className="inline-flex rounded-lg border border-neutral-200 bg-white p-0.5"
            role="tablist"
          >
            {(
              [
                { value: "entry", label: "入場" },
                { value: "reception", label: "受付" },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                role="tab"
                aria-selected={mode === option.value}
                onClick={() => setMode(option.value)}
                className={`rounded-md px-3 py-1 text-sm transition ${
                  mode === option.value
                    ? "bg-neutral-900 font-medium text-white"
                    : "text-neutral-500 hover:bg-neutral-100"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 text-sm text-neutral-500">
          表示時間
          <HourStepper
            value={range.start}
            onChange={(start) => setRange((r) => ({ ...r, start }))}
            label="表示開始時刻"
          />
          〜
          <HourStepper
            value={range.end}
            onChange={(end) => setRange((r) => ({ ...r, end }))}
            label="表示終了時刻"
          />
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 min-[414px]:hidden">
        <div className="flex items-center gap-2">
          <button
            onClick={() => shiftDate(-1)}
            disabled={date <= minDate}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-30"
          >
            <LeftOutlined />
          </button>
          <DatePicker
            value={date}
            onChange={onDateChange}
            minDate={minDate}
            maxDate={maxDate}
            size={32}
          />
          <button
            onClick={() => shiftDate(1)}
            disabled={date >= maxDate}
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 disabled:opacity-30"
          >
            <RightOutlined />
          </button>
        </div>

        <div className="flex items-center gap-2 text-sm text-neutral-500">
          表示時間
          <HourStepper
            value={range.start}
            onChange={(start) => setRange((r) => ({ ...r, start }))}
            label="表示開始時刻"
          />
          〜
          <HourStepper
            value={range.end}
            onChange={(end) => setRange((r) => ({ ...r, end }))}
            label="表示終了時刻"
          />
        </div>

        <div
          className="inline-flex w-fit rounded-lg border border-neutral-200 bg-white p-0.5"
          role="tablist"
        >
          {(
            [
              { value: "entry", label: "入場" },
              { value: "reception", label: "受付" },
            ] as const
          ).map((option) => (
            <button
              key={option.value}
              role="tab"
              aria-selected={mode === option.value}
              onClick={() => setMode(option.value)}
              className={`rounded-md px-3 py-1 text-sm transition ${
                mode === option.value
                  ? "bg-neutral-900 font-medium text-white"
                  : "text-neutral-500 hover:bg-neutral-100"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="max-[642px]:overflow-x-auto max-[642px]:-mx-1 max-[642px]:px-1">
        <div className="max-[642px]:min-w-[720px]">
          <ResponsiveContainer width="100%" height={320}>
            <ComposedChart data={data} barGap={2}>
              <CartesianGrid
                stroke="#f0f0f0"
                strokeWidth={1}
                vertical={false}
              />
              <XAxis
                dataKey="label"
                ticks={hourTicks}
                interval={0}
                fontSize={12}
                stroke="#9ca3af"
                tickLine={false}
                tick={(props) => (
                  <BoundaryTick {...(props as BoundaryTickProps)} />
                )}
              />
              <YAxis
                yAxisId="count"
                fontSize={12}
                stroke="#9ca3af"
                allowDecimals={false}
                domain={[0, settings.chartMaxCount]}
                tickCount={6}
                label={{
                  value: "人数",
                  angle: -90,
                  position: "insideLeft",
                  fontSize: 12,
                }}
              />
              <YAxis
                yAxisId="pct"
                orientation="right"
                fontSize={12}
                stroke="#9ca3af"
                domain={[
                  0,
                  (dataMax: number) =>
                    Math.max(100, Math.ceil(dataMax / 20) * 20),
                ]}
                label={{
                  value: "混雑率(%)",
                  angle: 90,
                  position: "insideRight",
                  fontSize: 12,
                }}
              />
              <Tooltip
                content={<ChartTooltip />}
                cursor={{ fill: "rgba(0, 0, 0, 0.04)" }}
              />
              <Legend content={<ChartLegend />} />
              {/* 積み上げ: 下=通常、上=整理券。上端角丸は「そのバケットで視覚的に
                  最上段のセグメント」のみ。整理券が 0 のバケットでは通常（青）が
                  最上段になるため、shape でデータ点ごとに角丸を切り替える */}
              <Bar
                yAxisId="count"
                dataKey="normal"
                name={labels.normal}
                stackId="count"
                fill={COLORS.normal}
                maxBarSize={24}
                // shape に渡る props の型（BarShapeProps）は recharts が公開していないため any で受ける
                shape={(props: any) => (
                  <Rectangle
                    {...props}
                    radius={
                      props.payload?.ticket === 0 ? [4, 4, 0, 0] : [0, 0, 0, 0]
                    }
                  />
                )}
              />
              <Bar
                yAxisId="count"
                dataKey="ticket"
                name={labels.ticket}
                stackId="count"
                fill={COLORS.ticket}
                maxBarSize={24}
                radius={[4, 4, 0, 0]}
              />
              <Line
                yAxisId="pct"
                type="monotone"
                dataKey="congestion"
                name="教室混雑率"
                stroke={COLORS.congestion}
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                dot={false}
                activeDot={{ r: 3, strokeWidth: 0 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
