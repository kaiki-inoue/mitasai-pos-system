import { useEffect, useMemo, useState } from "react";
import type {
  CashBreakdown,
  EnvName,
  RegisterSession,
  RegisterSessionType,
  StaffMember,
  Transaction,
  YearDoc,
} from "@/types";
import {
  useRegisterSessionsByYear,
  useTransactionsByDate,
} from "@/hooks/useYearData";
import {
  fetchAllTransactions,
  recordRegisterSession,
  updateRegisterSession,
} from "@/lib/dataApi";
import { CASH_DENOMINATIONS } from "@/utils/defaults";
import {
  formatTime,
  formatYen,
  shiftDateString,
  todayString,
} from "@/utils/format";
import { DatePicker } from "@/components/common/DatePicker";
import { NotificationModal } from "@/components/common/NotificationModal";
import { getUserFacingErrorMessage } from "@/utils/userFacingError";

type HistoryData = Pick<
  Transaction,
  "date" | "grandTotal"
>[];

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
  const [date, setDate] = useState(todayString);
  const [cashCounts, setCashCounts] = useState<Record<string, string>>({});
  const [editingSession, setEditingSession] =
    useState<RegisterSession | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const [yearTransactions, setYearTransactions] =
    useState<HistoryData | null>(null);
  const [transactionsError, setTransactionsError] = useState<string | null>(
    null,
  );
  const [transactionsLoading, setTransactionsLoading] = useState(true);

  const { data: sessions, loading: sessionsLoading } =
    useRegisterSessionsByYear(env, year.id);
  const today = todayString();
  const {
    data: todayTransactions,
    error: todayTransactionsError,
  } =
    useTransactionsByDate(env, year.id, today);

  useEffect(() => {
    let cancelled = false;
    setYearTransactions(null);
    setTransactionsError(null);
    setTransactionsLoading(true);
    fetchAllTransactions(env, year.id)
      .then((transactions) => {
        if (!cancelled) {
          setYearTransactions(
            transactions.map(({ date, grandTotal }) => ({ date, grandTotal })),
          );
        }
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        setTransactionsError(
          getUserFacingErrorMessage(
            error,
            "売上履歴を取得できませんでした。通信状態を確認してください。",
          ),
        );
      })
      .finally(() => {
        if (!cancelled) setTransactionsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [env, year.id, reloadKey]);

  const transactionsByDate = useMemo(() => {
    const totals = new Map<string, number>();
    (yearTransactions ?? []).forEach((transaction) => {
      if (transaction.date < year.startDate || transaction.date > year.endDate) {
        return;
      }
      totals.set(
        transaction.date,
        (totals.get(transaction.date) ?? 0) + transaction.grandTotal,
      );
    });
    if (today >= year.startDate && today <= year.endDate) {
      if (todayTransactionsError) {
        totals.delete(today);
      } else {
        const todayTotal = todayTransactions.reduce(
          (sum, transaction) => sum + transaction.grandTotal,
          0,
        );
        totals.set(today, todayTotal);
      }
    }
    return totals;
  }, [
    today,
    todayTransactions,
    year.endDate,
    year.startDate,
    yearTransactions,
    todayTransactionsError,
  ]);
  const firstOpenSession =
    sessions.find((session) => session.type === "open") ?? null;
  const lastCloseSession =
    [...sessions].reverse().find((session) => session.type === "close") ?? null;
  const periodCashIncrease =
    firstOpenSession && lastCloseSession
      ? lastCloseSession.totalAmount - firstOpenSession.totalAmount
      : null;

  const selectedSalesReady =
    date === today
      ? !todayTransactionsError
      : !transactionsLoading && !transactionsError;
  const selectedTransactionsError =
    date === today && todayTransactionsError
      ? "本日の会計記録を取得できません。締め記録の売上比較はできません。"
      : transactionsError;
  const selectedSales =
    selectedSalesReady
      ? date === today
        ? todayTransactions.reduce(
            (sum, transaction) => sum + transaction.grandTotal,
            0,
          )
        : transactionsByDate.get(date) ?? 0
      : null;
  const selectedSessions = sessions.filter((session) => session.date === date);
  const lastOpen = [...selectedSessions]
    .reverse()
    .find((session) => session.type === "open");
  const allFilled = CASH_DENOMINATIONS.every((denom) => {
    const raw = cashCounts[denom] ?? "";
    const count = Number(raw);
    return raw !== "" && Number.isInteger(count) && count >= 0;
  });
  const totalAmount = CASH_DENOMINATIONS.reduce(
    (sum, denom) => sum + denom * (Number(cashCounts[denom]) || 0),
    0,
  );
  const canRecord = allFilled && staffListReady && staff !== null;

  const changeDate = (nextDate: string) => {
    setDate(nextDate);
    setEditingSession(null);
    setCashCounts({});
  };

  const startCorrection = (session: RegisterSession) => {
    setDate(session.date);
    setEditingSession(session);
    setCashCounts(
      Object.fromEntries(
        CASH_DENOMINATIONS.map((denom) => [
          denom,
          String(session.cashBreakdown[denom] ?? 0),
        ]),
      ),
    );
  };

  const handleRecord = async (type: RegisterSessionType) => {
    if (!allFilled) return;
    if (!editingSession && type === "close" && !selectedSalesReady) {
      setAlertMessage(
        "会計記録を取得できないため、売上との差額を計算できません。通信状態を確認してください",
      );
      return;
    }
    if (!staffListReady) {
      setAlertMessage("担当者名簿を確認できません。通信状態を確認してください");
      return;
    }
    if (!staff) {
      setAlertMessage("スタッフを選択してください");
      return;
    }

    const cashBreakdown = Object.fromEntries(
      CASH_DENOMINATIONS.map((denom) => [denom, Number(cashCounts[denom])]),
    ) satisfies CashBreakdown;

    try {
      if (editingSession) {
        await updateRegisterSession(env, year.id, editingSession.id, {
          staffId: staff.id,
          cashBreakdown,
          totalAmount,
        });
      } else {
        const expectedAmount =
          type === "close" && lastOpen && selectedSales !== null
            ? lastOpen.totalAmount + selectedSales
            : null;
        await recordRegisterSession(env, year.id, {
          date,
          type,
          staffId: staff.id,
          staffName: staff.name,
          cashBreakdown,
          totalAmount,
          expectedAmount,
          diffFromOpen:
            type === "close" && lastOpen
              ? totalAmount - lastOpen.totalAmount
              : null,
          diffFromSales:
            expectedAmount !== null ? totalAmount - expectedAmount : null,
        });
      }
    } catch (error) {
      setAlertMessage(
        getUserFacingErrorMessage(
          error,
          "レジの記録を保存できませんでした。画面を再読み込みして、もう一度お試しください。",
        ),
      );
      return;
    }
    setCashCounts({});
    setEditingSession(null);
  };

  return (
    <section className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-4 text-sm font-semibold text-neutral-700">
          レジ開け・レジ締め
        </h3>
        <div className="mb-4">
          <DatePicker
            value={date}
            onChange={changeDate}
            minDate={year.startDate}
            maxDate={year.endDate}
            size={38}
          />
          <p className="mt-1 text-xs text-amber-600">
            日付を確認してからレジを記録してください
          </p>
        </div>

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
                onChange={(event) =>
                  setCashCounts((counts) => ({
                    ...counts,
                    [denom]: event.target.value,
                  }))
                }
                className="mt-1 h-9.5 w-full rounded-lg border border-neutral-300 px-2 text-sm"
              />
            </label>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-neutral-50 px-4 py-3">
          <span className="text-sm text-neutral-500">入力合計</span>
          <span className="text-xl font-bold tabular-nums text-neutral-900">
            {formatYen(totalAmount)}
          </span>
        </div>
        {(!allFilled || editingSession) && (
          <p className="mt-3 text-xs text-amber-600">
            すべての金種の枚数を入力してください（無い金種は「0」を入力）
          </p>
        )}

        {editingSession ? (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => {
                setEditingSession(null);
                setCashCounts({});
              }}
              className="flex-1 rounded-lg border border-neutral-300 py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100"
            >
              キャンセル
            </button>
            <button
              type="button"
              onClick={() => handleRecord(editingSession.type)}
              disabled={!canRecord}
              className="flex-1 rounded-lg bg-neutral-900 py-2.5 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
            >
              訂正を保存
            </button>
          </div>
        ) : (
          <div className="mt-4 flex gap-2">
            <button
              type="button"
              onClick={() => handleRecord("open")}
              disabled={!canRecord}
              className="flex-1 rounded-lg border border-neutral-300 bg-white py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              レジ開けを記録
            </button>
            <button
              type="button"
              onClick={() => handleRecord("close")}
              disabled={!canRecord}
              className="flex-1 rounded-lg border border-neutral-300 bg-white py-2.5 text-sm font-medium text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
            >
              レジ締めを記録
            </button>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-neutral-700">
              開催期間のレジ履歴
            </h3>
          </div>
          <div className="flex items-center gap-2 whitespace-nowrap">
            <span className="text-sm text-neutral-600">
              開催期間の売上（現金増加額）
            </span>
            <span className="text-lg font-bold tabular-nums text-neutral-900">
              {sessionsLoading
                ? "…"
                : periodCashIncrease === null
                  ? "—"
                  : formatYen(periodCashIncrease)}
            </span>
          </div>
        </div>
        {selectedTransactionsError && (
          <p role="alert" className="my-2 text-xs text-red-600">
            {selectedTransactionsError}
            {transactionsError && (
              <>
                {" "}
                <button
                  type="button"
                  onClick={() => setReloadKey((key) => key + 1)}
                  className="underline"
                >
                  再読み込み
                </button>
              </>
            )}
          </p>
        )}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] table-fixed border-collapse text-xs">
            <colgroup>
              <col className="w-14" />
              <col className="w-24" />
              <col className="w-28" />
              <col className="w-20" />
              <col className="w-24" />
              <col className="w-24" />
              <col className="w-24" />
              <col className="w-24" />
              <col className="w-28" />
              <col className="w-20" />
            </colgroup>
            <thead>
              <tr className="text-neutral-700">
                <th
                  rowSpan={2}
                  className="w-16 border-b border-neutral-200 px-2 py-1 text-left font-semibold"
                >
                  日付
                </th>
                <th
                  colSpan={3}
                  className="border-l border-neutral-200 px-2 py-1 text-center font-semibold"
                >
                  レジ開け
                </th>
                <th
                  colSpan={3}
                  className="border-l border-neutral-200 px-2 py-1 text-center font-semibold"
                >
                  売上
                </th>
                <th
                  colSpan={3}
                  className="border-l border-neutral-200 px-2 py-1 text-center font-semibold"
                >
                  レジ締め
                </th>
              </tr>
              <tr className="text-neutral-500">
                <th className="border-b border-l border-neutral-200 px-2 py-1 text-center font-medium">
                  金額
                </th>
                <th className="border-b border-neutral-200 px-2 py-1 text-center font-medium">
                  記録者・時刻
                </th>
                <th className="border-b border-neutral-200 px-1 py-1" />
                <th
                  title="レジ受付の取引履歴に記録された売上の合計"
                  className="border-b border-l border-neutral-200 px-2 py-1 text-center font-medium"
                >
                  会計記録売上
                </th>
                <th
                  title="レジ締め額からレジ開け額を引いた額"
                  className="border-b border-neutral-200 px-2 py-1 text-center font-medium"
                >
                  現金増加額
                </th>
                <th
                  title="現金増加額から会計記録売上を引いた額"
                  className="border-b border-neutral-200 px-2 py-1 text-center font-medium"
                >
                  差額
                </th>
                <th className="border-b border-l border-neutral-200 px-2 py-1 text-center font-medium">
                  金額
                </th>
                <th className="border-b border-neutral-200 px-2 py-1 text-center font-medium">
                  記録者・時刻
                </th>
                <th className="border-b border-neutral-200 px-1 py-1" />
              </tr>
            </thead>
            <tbody>
              {buildDateRange(year.startDate, year.endDate).map((day) => {
                const daySessions = sessions.filter(
                  (session) => session.date === day,
                );
                const opens = daySessions.filter(
                  (session) => session.type === "open",
                );
                const closes = daySessions.filter(
                  (session) => session.type === "close",
                );
                const open = opens[opens.length - 1] ?? null;
                const close = closes[closes.length - 1] ?? null;
                const receiptSales = transactionsByDate.get(day);
                const cashIncrease =
                  open && close ? close.totalAmount - open.totalAmount : null;
                const difference =
                  cashIncrease !== null && receiptSales !== undefined
                    ? cashIncrease - receiptSales
                    : null;
                const isToday = day === today;

                return (
                  <tr
                    key={day}
                    className={isToday ? "bg-amber-50/70" : "hover:bg-neutral-50"}
                  >
                    <th className="border-b border-neutral-100 px-2 py-2 text-left font-medium text-neutral-700">
                      {monthDay(day)}
                      {isToday && (
                        <span className="ml-1 text-[10px] text-amber-600">
                          今日
                        </span>
                      )}
                    </th>
                    <td className="border-b border-l border-neutral-100 px-2 py-2 text-right tabular-nums text-neutral-800">
                      <SessionAmount session={open} />
                    </td>
                    <td className="border-b border-neutral-100 px-2 py-2">
                      <SessionRecorder session={open} />
                    </td>
                    <td className="border-b border-neutral-100 px-2 py-2 text-center">
                      {open && (
                        <CorrectionControls
                          session={open}
                          onCorrect={startCorrection}
                        />
                      )}
                    </td>
                    <td className="border-b border-l border-neutral-100 px-2 py-2 text-right tabular-nums text-neutral-700">
                      {transactionsLoading
                        ? "…"
                        : transactionsError ||
                            (day === today && todayTransactionsError)
                          ? "—"
                          : formatYen(receiptSales ?? 0)}
                    </td>
                    <td className="border-b border-neutral-100 px-2 py-2 text-right font-semibold tabular-nums text-neutral-900">
                      {cashIncrease === null
                        ? "—"
                        : formatYen(cashIncrease)}
                    </td>
                    <td className="border-b border-neutral-100 px-2 py-2 text-right tabular-nums">
                      <DifferenceBadge value={difference} />
                    </td>
                    <td className="border-b border-l border-neutral-100 px-2 py-2 text-right tabular-nums text-neutral-800">
                      <SessionAmount session={close} />
                    </td>
                    <td className="border-b border-neutral-100 px-2 py-2">
                      <SessionRecorder session={close} />
                    </td>
                    <td className="border-b border-neutral-100 px-2 py-2 text-center">
                      {close && (
                        <CorrectionControls
                          session={close}
                          onCorrect={startCorrection}
                        />
                      )}
                    </td>
                  </tr>
                );
              })}
              {sessionsLoading && (
                <tr>
                  <td colSpan={10} className="py-4 text-center text-neutral-400">
                    レジ履歴を読み込み中...
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {alertMessage && (
        <NotificationModal
          message={alertMessage}
          onClose={() => setAlertMessage(null)}
        />
      )}
    </section>
  );
}

function SessionAmount({ session }: { session: RegisterSession | null }) {
  if (!session) {
    return <span className="text-neutral-400">未記録</span>;
  }
  return (
    <span className="whitespace-nowrap">
      {formatYen(session.totalAmount)}
      {session.revisions && session.revisions.length > 0 && (
        <span className="ml-1 text-[10px] text-amber-600">訂正あり</span>
      )}
    </span>
  );
}

function SessionRecorder({ session }: { session: RegisterSession | null }) {
  if (!session) {
    return <span className="text-neutral-400">—</span>;
  }
  return (
    <div className="space-y-0.5 text-neutral-500">
      <p
        title={`${session.staffName} ${formatTime(session.createdAt)}`}
        className="truncate whitespace-nowrap"
      >
        {session.staffName} {formatTime(session.createdAt)}
      </p>
      {session.updatedAt && session.updatedByStaffName && (
        <p className="text-amber-600">
          訂正 {session.updatedByStaffName} {formatTime(session.updatedAt)}
        </p>
      )}
      {session.revisions && session.revisions.length > 0 && (
        <details className="whitespace-normal">
          <summary className="cursor-pointer text-neutral-500 underline">
            訂正履歴 {session.revisions.length}件
          </summary>
          <ul className="mt-1 space-y-1">
            {session.revisions.map((revision, index) => (
              <li key={`${revision.revisedAt}-${index}`}>
                {formatYen(revision.totalAmount)} — {revision.staffName}{" "}
                {formatTime(revision.recordedAt)}
                <br />
                訂正 {revision.revisedByStaffName}{" "}
                {formatTime(revision.revisedAt)}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}

function CorrectionControls({
  session,
  onCorrect,
}: {
  session: RegisterSession;
  onCorrect: (session: RegisterSession) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onCorrect(session)}
      className="whitespace-nowrap text-xs underline hover:text-neutral-900"
    >
      金額を訂正
    </button>
  );
}

function DifferenceBadge({ value }: { value: number | null }) {
  if (value === null) return <span className="text-neutral-400">—</span>;
  return (
    <span
      className={
        value === 0
          ? "text-neutral-500"
          : value > 0
            ? "text-blue-700"
            : "text-red-600"
      }
    >
      {value > 0 ? "+" : ""}
      {formatYen(value)}
    </span>
  );
}

function monthDay(date: string): string {
  const [, month, day] = date.split("-");
  return `${Number(month)}/${Number(day)}`;
}

function buildDateRange(startDate: string, endDate: string): string[] {
  if (startDate > endDate) return [];
  const dates: string[] = [];
  for (let date = startDate; date <= endDate; date = shiftDateString(date, 1)) {
    dates.push(date);
  }
  return dates;
}
