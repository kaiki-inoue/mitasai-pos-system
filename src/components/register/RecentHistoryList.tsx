// 直近の確定履歴。編集・削除が行える
import {
  EditOutlined,
  DeleteOutlined,
  UnorderedListOutlined,
} from "@ant-design/icons";
import type { Transaction } from "@/types";
import { formatDateTime, formatYen } from "@/utils/format";
import { summarizeTransactionItems } from "@/utils/transactionSummary";

interface Props {
  transactions: Transaction[];
  onEdit: (transaction: Transaction) => void;
  onDelete: (transaction: Transaction) => void;
  onViewFullHistory?: () => void;
}

export function RecentHistoryList({
  transactions,
  onEdit,
  onDelete,
  onViewFullHistory,
}: Props) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700">直近の履歴</h3>
        {onViewFullHistory && (
          <button
            onClick={onViewFullHistory}
            className="flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 px-3 text-xs text-neutral-500 hover:bg-neutral-100"
          >
            <UnorderedListOutlined /> 履歴一覧
          </button>
        )}
      </div>
      {transactions.length === 0 ? (
        <p className="text-sm text-neutral-400">まだ確定はありません</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {transactions.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="flex min-w-0 flex-1 items-baseline gap-3 overflow-hidden">
                <span className="w-14 shrink-0 text-sm font-medium text-neutral-900">
                  {formatYen(t.grandTotal)}
                </span>
                <span className="w-28 shrink-0 text-xs tabular-nums text-neutral-400">
                  {formatDateTime(t.createdAt)}
                </span>
                <span className="w-18 shrink-0 truncate text-xs text-neutral-400">
                  {t.staffName}
                </span>
                <span className="min-w-0 flex-1 truncate text-xs text-neutral-600">
                  {summarizeTransactionItems(t)}
                  {t.note && ` ・ ${t.note}`}
                </span>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <button
                  onClick={() => onEdit(t)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-100"
                  aria-label="編集"
                >
                  <EditOutlined />
                </button>
                <button
                  onClick={() => onDelete(t)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-100"
                  aria-label="削除"
                >
                  <DeleteOutlined />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
