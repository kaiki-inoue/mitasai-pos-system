import { useEffect, useMemo, useState } from "react";
import { DownOutlined } from "@ant-design/icons";
import type {
  EnvName,
  FeeItem,
  GroupFeeItem,
  Product,
  Transaction,
} from "@/types";
import { fetchAllTransactions } from "@/lib/dataApi";
import { useTransactionsByDate } from "@/hooks/useYearData";
import { formatYen, todayString } from "@/utils/format";
import { calculateTransactionTotals } from "@/utils/transactionSummary";
import { getUserFacingErrorMessage } from "@/utils/userFacingError";

interface Props {
  env: EnvName;
  yearId: string;
  feeItems: FeeItem[];
  groupItems: GroupFeeItem[];
  products: Product[];
}

interface SummaryValue {
  amount: string;
}

export function SalesSummaryPanel({
  env,
  yearId,
  feeItems,
  groupItems,
  products,
}: Props) {
  const [entranceExpanded, setEntranceExpanded] = useState(false);
  const [productsExpanded, setProductsExpanded] = useState(false);
  const today = todayString();
  const {
    data: todayTransactions,
    loading: todayLoading,
    error: todayError,
  } = useTransactionsByDate(env, yearId, today);
  const [periodTransactions, setPeriodTransactions] = useState<
    Transaction[] | null
  >(null);
  const [periodLoading, setPeriodLoading] = useState(true);
  const [periodError, setPeriodError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setPeriodTransactions(null);
    setPeriodLoading(true);
    setPeriodError(null);
    fetchAllTransactions(env, yearId)
      .then((transactions) => {
        if (!cancelled) setPeriodTransactions(transactions);
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setPeriodTransactions(null);
        setPeriodError(
          getUserFacingErrorMessage(
            error,
            "開催期間累計を読み込めませんでした。通信状態を確認してください。",
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setPeriodLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [env, yearId, reloadKey]);

  const todayTotals = useMemo(
    () => calculateTransactionTotals(todayTransactions),
    [todayTransactions],
  );
  const periodTotals = useMemo(() => {
    if (!periodTransactions) return null;
    const pastTransactions = periodTransactions.filter(
      (transaction) => transaction.date !== today,
    );
    return calculateTransactionTotals([
      ...pastTransactions,
      ...todayTransactions,
    ]);
  }, [periodTransactions, today, todayTransactions]);

  const todayCount = (value: number): SummaryValue =>
    todayLoading
      ? { amount: "…" }
      : todayError
        ? { amount: "—" }
        : { amount: value.toLocaleString("ja-JP") };
  const periodCount = (value: number): SummaryValue =>
    periodLoading || todayLoading
      ? { amount: "…" }
      : todayError || periodError || !periodTotals
        ? { amount: "—" }
        : { amount: value.toLocaleString("ja-JP") };
  const todayYen = (value: number): SummaryValue => ({
    amount: todayLoading ? "…" : todayError ? "—" : formatYen(value),
  });
  const periodYen = (value: number): SummaryValue => ({
    amount:
      periodLoading || todayLoading
        ? "…"
        : todayError || periodError || !periodTotals
          ? "—"
          : formatYen(value),
  });

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-neutral-700">売上状況</h3>
      {todayError && (
        <p role="alert" className="mb-2 text-xs text-red-600">
          日次売上を取得できませんでした。画面を再読み込みしてください。
        </p>
      )}
      {periodError && (
        <div
          role="alert"
          className="mb-2 flex items-center justify-between gap-2 text-xs text-red-600"
        >
          <span>{periodError}</span>
          <button
            type="button"
            onClick={() => setReloadKey((key) => key + 1)}
            className="shrink-0 underline"
          >
            再読み込み
          </button>
        </div>
      )}

      <div className="space-y-1 text-xs">
        <div className="grid grid-cols-[40%_27%_33%] px-2 pb-1 text-neutral-500">
          <span />
          <span className="text-right font-medium">本日</span>
          <span className="text-right font-medium">開催期間累計</span>
        </div>
        <SummaryRow
          label="入場料売上"
          today={todayYen(todayTotals.entranceSales)}
          period={periodYen(periodTotals?.entranceSales ?? 0)}
          expanded={entranceExpanded}
          detailsId="entrance-sales-details"
          onClick={() => setEntranceExpanded((expanded) => !expanded)}
          subtotal
        />
        {entranceExpanded && (
          <div
            id="entrance-sales-details"
            className="space-y-0.5 pb-1 text-neutral-500"
          >
            {feeItems.map((item) => (
              <SummaryDetail
                key={`fee-${item.id}`}
                label={formatQuantityLabel(item.label, item.unit)}
                today={todayCount(todayTotals.feeCounts[item.id] ?? 0)}
                period={periodCount(periodTotals?.feeCounts[item.id] ?? 0)}
              />
            ))}
            {groupItems.map((item) => (
              <SummaryDetail
                key={`group-${item.id}`}
                label={formatGroupQuantityLabel(item.label, item.unit)}
                today={todayCount(todayTotals.groupCounts[item.id] ?? 0)}
                period={periodCount(periodTotals?.groupCounts[item.id] ?? 0)}
              />
            ))}
            <SummaryDetail
              label="来場人数（人）"
              today={todayCount(todayTotals.visitorCount)}
              period={periodCount(periodTotals?.visitorCount ?? 0)}
            />
          </div>
        )}
        <SummaryRow
          label="物販売上"
          today={todayYen(todayTotals.productSales)}
          period={periodYen(periodTotals?.productSales ?? 0)}
          expanded={productsExpanded}
          detailsId="product-sales-details"
          onClick={() => setProductsExpanded((expanded) => !expanded)}
          subtotal
        />
        {productsExpanded && (
          <div
            id="product-sales-details"
            className="space-y-0.5 pb-1 text-neutral-500"
          >
            {products.map((product) => (
              <SummaryDetail
                key={`product-${product.id}`}
                label={formatQuantityLabel(product.name, product.unit)}
                today={todayCount(
                  todayTotals.productCounts[product.id] ?? 0,
                )}
                period={periodCount(
                  periodTotals?.productCounts[product.id] ?? 0,
                )}
              />
            ))}
          </div>
        )}
        <SummaryRow
          label="売上合計"
          today={todayYen(todayTotals.totalSales)}
          period={periodYen(periodTotals?.totalSales ?? 0)}
          total
        />
      </div>
    </section>
  );
}

function SummaryRow({
  label,
  today,
  period,
  subtotal = false,
  total = false,
  expanded,
  detailsId,
  onClick,
}: {
  label: string;
  today: SummaryValue;
  period: SummaryValue;
  subtotal?: boolean;
  total?: boolean;
  expanded?: boolean;
  detailsId?: string;
  onClick?: () => void;
}) {
  const className = `grid w-full grid-cols-[40%_27%_33%] items-center px-2 text-left ${
    total
      ? "border-t border-neutral-200 pt-2 text-neutral-900"
      : subtotal
        ? "rounded-md py-2 text-neutral-800 transition-colors hover:bg-neutral-100 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-neutral-900"
        : "py-1 text-neutral-600"
  }`;

  const contents = (
    <>
      <span className="flex min-w-0 items-center gap-1">
        <span className="truncate">{label}</span>
        {onClick && (
          <DownOutlined
            className={`shrink-0 text-[9px] text-neutral-400 transition-transform ${
              expanded ? "rotate-180" : ""
            }`}
          />
        )}
      </span>
      <span className="text-right tabular-nums">{today.amount}</span>
      <span className="text-right tabular-nums">{period.amount}</span>
    </>
  );

  if (!onClick) {
    return <div className={className}>{contents}</div>;
  }

  return (
    <button
      type="button"
      className={className}
      onClick={onClick}
      aria-expanded={expanded}
      aria-controls={detailsId}
    >
      {contents}
    </button>
  );
}

function SummaryDetail({
  label,
  today,
  period,
}: {
  label: string;
  today: SummaryValue;
  period: SummaryValue;
}) {
  return (
    <div className="grid grid-cols-[40%_27%_33%] items-center px-2 py-1">
      <span className="truncate pl-2">{label}</span>
      <span className="text-right tabular-nums text-neutral-700">
        {today.amount}
      </span>
      <span className="text-right tabular-nums text-neutral-700">
        {period.amount}
      </span>
    </div>
  );
}

function formatQuantityLabel(label: string, unit: string): string {
  if (!unit) return label;
  return unit === label ? `${label}数` : `${label}（${unit}）`;
}

function formatGroupQuantityLabel(label: string, unit: string): string {
  if (unit === label || !unit) return `${label}数`;
  return `${label}（${unit}）`;
}
