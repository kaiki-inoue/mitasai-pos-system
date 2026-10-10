// 金額計算タブ：入場料・グループ料金・物販の入力と確定
import { useEffect, useMemo, useState } from "react";
import { TagOutlined } from "@ant-design/icons";
import type {
  EnvName,
  FeeItem,
  GroupFeeItem,
  Product,
  StaffMember,
  Ticket,
  Transaction,
  YearSettings,
} from "@/types";
import {
  buildFeeLines,
  buildGroupLines,
  buildProductLines,
  calcEntryCount,
  calcFeeTotal,
  calcProductTotal,
} from "@/utils/calcFee";
import { generateSerial } from "@/utils/id";
import { formatYen } from "@/utils/format";
import {
  confirmTransaction,
  deleteTicket,
  deleteTransaction,
  issueTicket,
  updateTransaction,
} from "@/lib/dataApi";
import { CounterInput } from "./CounterInput";
import { TicketModal } from "./TicketModal";
import { TicketList } from "./TicketList";
import { RecentHistoryList } from "./RecentHistoryList";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";

type Mode =
  | { type: "new" }
  | { type: "ticket"; ticketId: string }
  | { type: "edit"; transactionId: string };

interface Props {
  env: EnvName;
  yearId: string;
  staff: StaffMember | null;
  staffListReady: boolean;
  feeItems: FeeItem[];
  products: Product[];
  groupItems: GroupFeeItem[];
  settings: YearSettings;
  recentTransactions: Transaction[];
  pendingTickets: Ticket[];
  /** 履歴一覧（設定タブ）から編集要求された取引。消費後は onExternalEditConsumed で親側をリセットする */
  externalEditTarget?: Transaction | null;
  onExternalEditConsumed?: () => void;
  /** 「履歴一覧」ボタン押下時（設定タブの履歴一覧セクションへ遷移する） */
  onViewFullHistory: () => void;
}

export function RegisterTab({
  env,
  yearId,
  staff,
  staffListReady,
  feeItems,
  products,
  groupItems,
  recentTransactions,
  pendingTickets,
  externalEditTarget,
  onExternalEditConsumed,
  onViewFullHistory,
}: Props) {
  const [feeCounts, setFeeCounts] = useState<Record<string, number>>({});
  const [groupCounts, setGroupCounts] = useState<Record<string, number>>({});
  const [productCounts, setProductCounts] = useState<Record<string, number>>(
    {},
  );
  const [feeWaived, setFeeWaived] = useState(false);
  const [note, setNote] = useState("");
  const [mode, setMode] = useState<Mode>({ type: "new" });
  const [ticketSerial, setTicketSerial] = useState<string | null>(null);
  const [deleteTicketTarget, setDeleteTicketTarget] = useState<Ticket | null>(
    null,
  );
  const [deleteTransactionTarget, setDeleteTransactionTarget] =
    useState<Transaction | null>(null);

  const feeLines = useMemo(
    () => buildFeeLines(feeItems, feeCounts),
    [feeItems, feeCounts],
  );
  const groupLines = useMemo(
    () => buildGroupLines(groupItems, groupCounts),
    [groupItems, groupCounts],
  );
  const productLines = useMemo(
    () => buildProductLines(products, productCounts),
    [products, productCounts],
  );
  const feeTotal = feeWaived ? 0 : calcFeeTotal(feeLines, groupLines);
  const productTotal = calcProductTotal(productLines);
  const grandTotal = feeTotal + productTotal;
  const entryCount = calcEntryCount(feeLines);
  // グループ料金のみの入力では確定できない（入場料項目か物販が1件以上必要）
  const canConfirm =
    feeLines.some((l) => l.qty > 0) || productLines.some((l) => l.qty > 0);
  const canSubmit = canConfirm && staffListReady && staff !== null;

  const resetForm = () => {
    setFeeCounts({});
    setGroupCounts({});
    setProductCounts({});
    setFeeWaived(false);
    setNote("");
    setMode({ type: "new" });
  };

  const loadCountsFrom = (lines: {
    feeLines: Transaction["feeLines"];
    groupLines: Transaction["groupLines"];
    productLines: Transaction["productLines"];
    feeWaived: boolean;
    note: string;
  }) => {
    setFeeCounts(
      Object.fromEntries(lines.feeLines.map((l) => [l.itemId, l.qty])),
    );
    setGroupCounts(
      Object.fromEntries(lines.groupLines.map((l) => [l.itemId, l.qty])),
    );
    setProductCounts(
      Object.fromEntries(lines.productLines.map((l) => [l.productId, l.qty])),
    );
    setFeeWaived(lines.feeWaived);
    setNote(lines.note);
  };

  const handleConfirm = async () => {
    if (!canConfirm) return;
    if (!staffListReady) {
      alert("担当者名簿を確認できません。通信状態を確認してください");
      return;
    }
    if (!staff) {
      alert("スタッフを選択してください");
      return;
    }
    try {
      if (mode.type === "edit") {
        await updateTransaction(env, yearId, mode.transactionId, staff.id, {
          feeLines,
          groupLines,
          feeWaived,
          feeTotal,
          productLines,
          productTotal,
          grandTotal,
          note,
          entryCount,
        });
      } else {
        await confirmTransaction(env, yearId, {
          feeLines,
          groupLines,
          feeWaived,
          feeTotal,
          productLines,
          productTotal,
          grandTotal,
          note,
          staffId: staff.id,
          staffName: staff.name,
          entryCount,
          ticketId: mode.type === "ticket" ? mode.ticketId : null,
        });
      }
    } catch (error) {
      alert(
        error instanceof Error
          ? error.message
          : "会計を確定できませんでした。通信状態を確認してください",
      );
      return;
    }
    resetForm();
  };

  const handleIssueTicket = () => {
    setTicketSerial(generateSerial());
  };

  const handleTicketModalConfirm = async (arrivalTime: string) => {
    if (!ticketSerial) return;
    await issueTicket(env, yearId, ticketSerial, arrivalTime, {
      feeLines,
      groupLines,
      feeWaived,
      productLines,
      note,
    });
    setTicketSerial(null);
    resetForm();
  };

  const handleSettleTicket = (ticket: Ticket) => {
    loadCountsFrom(ticket.pendingData);
    setMode({ type: "ticket", ticketId: ticket.id });
  };

  const handleDeleteTicket = async (ticket: Ticket) => {
    await deleteTicket(env, yearId, ticket.id);
    setDeleteTicketTarget(null);
  };

  const handleEditTransaction = (t: Transaction) => {
    loadCountsFrom(t);
    setMode({ type: "edit", transactionId: t.id });
  };

  // 履歴一覧（設定タブ）からの編集要求を受け取り、編集モードで開く。
  // 消費直後に親側の状態をリセットして再トリガーを防ぐ
  useEffect(() => {
    if (!externalEditTarget) return;
    loadCountsFrom(externalEditTarget);
    setMode({ type: "edit", transactionId: externalEditTarget.id });
    onExternalEditConsumed?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [externalEditTarget]);

  const handleDeleteTransaction = async (t: Transaction) => {
    await deleteTransaction(env, yearId, t.id);
    setDeleteTransactionTarget(null);
  };

  return (
    // PC横画面で1画面に収まるよう左右2エリア構成
    // （左2/3: 上段に入場料金＋グループ料金｜物販の数量入力、中段に備考、下段に直近の履歴／右1/3: 合計・整理券）。
    // 各ラッパーはモバイルでは display:contents で外し、order で縦積み順を制御する
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-3 lg:items-start">
      <div className="contents lg:col-span-2 lg:block">
        {/* 上段: 数量入力（高さ固定せず項目数に応じて伸縮）。
            743px以上（タブレット・PC）で2列化し、外側ラッパーがcontentsのままの
            743〜1024px（タブレット）でも正しい位置に並ぶようorder-2を付与する */}
        <div className="order-2 contents min-[743px]:grid min-[743px]:grid-cols-2 min-[743px]:gap-4">
          <section className="order-2">
            <div className="space-y-2">
              {feeItems.map((item) => (
                <CounterInput
                  key={item.id}
                  label={item.label}
                  sublabel={`${formatYen(item.unitPrice)} / ${item.unit || "人"}`}
                  value={feeCounts[item.id] ?? 0}
                  onChange={(v) =>
                    setFeeCounts((c) => ({ ...c, [item.id]: v }))
                  }
                />
              ))}
              {groupItems.map((item) => (
                <CounterInput
                  key={item.id}
                  label={item.label}
                  sublabel={`${formatYen(item.price)} / ${item.unit || "グループ"}`}
                  value={groupCounts[item.id] ?? 0}
                  onChange={(v) =>
                    setGroupCounts((c) => ({ ...c, [item.id]: v }))
                  }
                />
              ))}
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm text-neutral-600">
              <input
                type="checkbox"
                checked={feeWaived}
                onChange={(e) => setFeeWaived(e.target.checked)}
                className="h-4 w-4 rounded border-neutral-300"
              />
              入場料金を徴収しない
            </label>
          </section>

          <section className="order-3">
            <div className="space-y-2">
              {products.map((product) => (
                <CounterInput
                  key={product.id}
                  label={product.name}
                  sublabel={`${formatYen(product.unitPrice)} / ${product.unit || "個"}`}
                  value={productCounts[product.id] ?? 0}
                  onChange={(v) =>
                    setProductCounts((c) => ({ ...c, [product.id]: v }))
                  }
                />
              ))}
            </div>
          </section>
        </div>

        {/* 中段: 備考（上段の直下に隙間を作らず配置） */}
        <section className="order-4 lg:mt-4">
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            maxLength={120}
            rows={2}
            aria-label="備考欄"
            className="w-full resize-none rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            placeholder="備考欄"
          />
        </section>

        {/* 下段: 直近の履歴（左カラム幅いっぱいに横長で表示） */}
        <div className="order-5 lg:mt-4">
          <RecentHistoryList
            transactions={recentTransactions}
            onEdit={handleEditTransaction}
            onDelete={(t) => setDeleteTransactionTarget(t)}
            onViewFullHistory={onViewFullHistory}
          />
        </div>
      </div>

      <div className="contents lg:col-start-3 lg:row-start-1 lg:block lg:space-y-6">
        <div className="order-1 rounded-xl border border-neutral-200 bg-white p-5">
          {mode.type !== "new" && (
            <p className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-700">
              {mode.type === "ticket"
                ? "整理券の精算中です"
                : "履歴を編集中です"}
              <button onClick={resetForm} className="ml-2 underline">
                キャンセル
              </button>
            </p>
          )}
          <div className="mb-1 flex justify-between text-sm text-neutral-500">
            <span>入場料</span>
            <span>{formatYen(feeTotal)}</span>
          </div>
          <div className="mb-3 flex justify-between text-sm text-neutral-500">
            <span>物販</span>
            <span>{formatYen(productTotal)}</span>
          </div>
          <div className="mb-4 flex items-baseline justify-between border-t border-neutral-100 pt-3">
            <span className="text-sm font-medium text-neutral-700">
              合計金額
            </span>
            <span className="text-2xl font-bold text-neutral-900">
              {formatYen(grandTotal)}
            </span>
          </div>

          <button
            onClick={handleConfirm}
            disabled={!canSubmit}
            className="w-full rounded-lg bg-neutral-900 py-3 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {mode.type === "edit" ? "更新する" : "確定"}
          </button>
          <button
            onClick={handleIssueTicket}
            disabled={mode.type !== "new" || !feeLines.some((l) => l.qty > 0)}
            className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg border border-neutral-300 py-2.5 text-sm text-neutral-700 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            <TagOutlined /> 整理券配布
          </button>
        </div>

        <div className="order-6">
          <TicketList
            tickets={pendingTickets}
            onSettle={handleSettleTicket}
            onDelete={(ticket) => setDeleteTicketTarget(ticket)}
          />
        </div>
      </div>

      {ticketSerial && (
        <TicketModal
          serial={ticketSerial}
          onCancel={() => setTicketSerial(null)}
          onConfirm={handleTicketModalConfirm}
        />
      )}

      {deleteTicketTarget && (
        <ConfirmDeleteModal
          title="整理券の削除"
          message={`整理券 ${deleteTicketTarget.serial} を削除しますか？この操作は元に戻せません。`}
          onConfirm={() => handleDeleteTicket(deleteTicketTarget)}
          onCancel={() => setDeleteTicketTarget(null)}
        />
      )}

      {deleteTransactionTarget && (
        <ConfirmDeleteModal
          title="履歴の削除"
          message="この履歴を削除しますか？この操作は元に戻せません。"
          onConfirm={() => handleDeleteTransaction(deleteTransactionTarget)}
          onCancel={() => setDeleteTransactionTarget(null)}
        />
      )}
    </div>
  );
}
