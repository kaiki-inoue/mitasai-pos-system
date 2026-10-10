// 管理: レジ開け・レジ締め
import { useMemo, useState } from "react";
import type { EnvName, RegisterSession, StaffMember, YearDoc } from "@/types";
import {
  useRegisterSessions,
  useTransactionsByDate,
} from "@/hooks/useYearData";
import { recordRegisterSession } from "@/lib/dataApi";
import { CASH_DENOMINATIONS } from "@/utils/defaults";
import { formatDateTime, formatYen } from "@/utils/format";
import { DatePicker } from "@/components/common/DatePicker";

export function RegisterSessionPanel({
  env,
  year,
  staff,
  staffListReady,
}: {
  env: EnvName;
  year: YearDoc;
  staff: StaffMember | null;
  staffListReady: boolean;
}) {
  // 日付は開催期間内から明示的に選ばせるため、初期状態は未選択
  const [date, setDate] = useState("");
  // 金種の枚数は「0」を明示的に入力させるため、入力前は空文字列で保持する
  const [cashCounts, setCashCounts] = useState<Record<string, string>>({});

  // 日付未選択の間は購読しない（yearId に null を渡すとフックが購読を停止する）
  const { data: sessions } = useRegisterSessions(
    env,
    date ? year.id : null,
    date,
  );
  const { data: salesTransactions } = useTransactionsByDate(
    env,
    date ? year.id : null,
    date,
  );

  const allFilled = CASH_DENOMINATIONS.every((denom) => {
    const raw = cashCounts[denom] ?? "";
    const n = Number(raw);
    return raw !== "" && Number.isInteger(n) && n >= 0;
  });
  const totalAmount = useMemo(
    () =>
      CASH_DENOMINATIONS.reduce(
        (sum, denom) => sum + denom * (Number(cashCounts[denom]) || 0),
        0,
      ),
    [cashCounts],
  );
  const salesTotal = useMemo(
    () => salesTransactions.reduce((sum, t) => sum + t.grandTotal, 0),
    [salesTransactions],
  );
  const lastOpen = [...sessions].reverse().find((s) => s.type === "open");
  const canRecord =
    date !== "" && allFilled && staffListReady && staff !== null;

  const handleRecord = async (type: "open" | "close") => {
    if (!date || !allFilled) return;
    if (!staffListReady) {
      alert("担当者名簿を確認できません。通信状態を確認してください");
      return;
    }
    if (!staff) {
      alert("スタッフを選択してください");
      return;
    }
    const expectedAmount =
      type === "close" && lastOpen ? lastOpen.totalAmount + salesTotal : null;
    try {
      await recordRegisterSession(env, year.id, {
        date,
        type,
        staffId: staff.id,
        staffName: staff.name,
        cashBreakdown: Object.fromEntries(
          CASH_DENOMINATIONS.map((denom) => [denom, Number(cashCounts[denom])]),
        ),
        totalAmount,
        expectedAmount,
        diffFromOpen:
          type === "close" && lastOpen
            ? totalAmount - lastOpen.totalAmount
            : null,
        diffFromSales:
          expectedAmount !== null ? totalAmount - expectedAmount : null,
      });
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "記録できませんでした。通信状態を確認してください",
      );
      return;
    }
    setCashCounts({});
  };

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="mb-4">
        <h3 className="mb-3 text-sm font-semibold text-neutral-700">
          レジ開け・レジ締め
        </h3>
        <DatePicker
          value={date}
          onChange={setDate}
          minDate={year.startDate}
          maxDate={year.endDate}
          size={38}
        />
      </div>

      {date === "" ? (
        <p className="rounded-lg bg-neutral-50 px-4 py-6 text-center text-sm text-neutral-400">
          開催期間内の日付を選択してください
        </p>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            {CASH_DENOMINATIONS.map((denom) => (
              <label key={denom} className="text-xs text-neutral-500">
                {denom >= 1000
                  ? `${denom.toLocaleString()}円札`
                  : `${denom}円玉`}
                <input
                  type="number"
                  min={0}
                  placeholder="0"
                  value={cashCounts[denom] ?? ""}
                  onChange={(e) =>
                    setCashCounts((c) => ({ ...c, [denom]: e.target.value }))
                  }
                  className="mt-1 h-9.5 w-full rounded-lg border border-neutral-300 px-2 text-sm"
                />
              </label>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-3">
            <span className="text-sm text-neutral-500">合計金額</span>
            <span className="text-xl font-bold text-neutral-900">
              {formatYen(totalAmount)}
            </span>
          </div>

          {!allFilled && (
            <p className="mt-3 text-xs text-amber-600">
              すべての金種の枚数を入力してください（無い金種は「0」を入力）
            </p>
          )}

          <div className="mt-4 flex gap-2">
            <button
              onClick={() => handleRecord("open")}
              disabled={!canRecord}
              className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              レジ開け
            </button>
            <button
              onClick={() => handleRecord("close")}
              disabled={!canRecord}
              className="flex-1 rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              レジ締め
            </button>
          </div>

          <SessionHistory sessions={sessions} salesTotal={salesTotal} />
        </>
      )}
    </section>
  );
}

function SessionHistory({
  sessions,
  salesTotal,
}: {
  sessions: RegisterSession[];
  salesTotal: number;
}) {
  if (sessions.length === 0) return null;
  return (
    <div className="mt-5 border-t border-neutral-100 pt-4">
      <p className="mb-2 text-xs text-neutral-400">
        この日の売上集計：{formatYen(salesTotal)}
      </p>
      <ul className="space-y-2 text-sm">
        {sessions.map((s) => (
          <li key={s.id} className="rounded-lg bg-neutral-50 px-3 py-2">
            <p className="font-medium text-neutral-800">
              {s.type === "open" ? "レジ開け" : "レジ締め"}{" "}
              {formatYen(s.totalAmount)}
              <span className="ml-2 text-xs text-neutral-400">
                {s.staffName} ・ {formatDateTime(s.createdAt)}
              </span>
            </p>
            {s.type === "close" && (
              <p className="mt-1 text-xs text-neutral-500">
                開けとの差額：
                <DiffBadge value={s.diffFromOpen} /> ／ 売上集計との差額：
                <DiffBadge value={s.diffFromSales} />
              </p>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

function DiffBadge({ value }: { value: number | null }) {
  if (value === null) return null;
  const isZero = value === 0;
  return (
    <span
      className={
        isZero
          ? "text-neutral-600"
          : value > 0
            ? "text-blue-600"
            : "text-red-600"
      }
    >
      {" "}
      {value > 0 ? "+" : ""}
      {formatYen(value)}
    </span>
  );
}
