// 管理: 履歴一覧（CSV出力を統合）
// 無料枠を意識し、常時のリアルタイム購読はせず開いたとき／更新時にのみ取得する
import { useEffect, useState } from "react";
import {
  DeleteOutlined,
  DownloadOutlined,
  EditOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import type {
  EnvName,
  FeeItem,
  GroupFeeItem,
  Product,
  Transaction,
  YearDoc,
} from "@/types";
import { deleteTransaction, fetchAllTransactions } from "@/lib/dataApi";
import { downloadCsv, transactionsToCsv } from "@/utils/csv";
import {
  downloadTimestamp,
  formatDateTime,
  formatYen,
  todayString,
} from "@/utils/format";
import { summarizeTransactionItems } from "@/utils/transactionSummary";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";
import { DatePicker } from "@/components/common/DatePicker";

export function FullHistory({
  env,
  year,
  feeItems,
  groupFeeItems,
  products,
  onEditTransaction,
}: {
  env: EnvName;
  year: YearDoc;
  feeItems: FeeItem[];
  groupFeeItems: GroupFeeItem[];
  products: Product[];
  onEditTransaction: (t: Transaction) => void;
}) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [csvDate, setCsvDate] = useState(todayString());
  const [deleteTarget, setDeleteTarget] = useState<Transaction | null>(null);

  const load = () => {
    setLoading(true);
    fetchAllTransactions(env, year.id)
      .then((data) => setTransactions([...data].reverse())) // 新しい順
      .finally(() => setLoading(false));
  };

  useEffect(load, [env, year.id]);

  const handleDelete = async (t: Transaction) => {
    await deleteTransaction(env, year.id, t.id);
    setTransactions((prev) => prev.filter((x) => x.id !== t.id));
    setDeleteTarget(null);
  };

  // CSVは取得済みの一覧から生成する（追加のFirestore読み取りをしない）。出力は古い順
  const dailyTransactions = transactions.filter((t) => t.date === csvDate);
  const handleDailyExport = () => {
    downloadCsv(
      transactionsToCsv(
        [...dailyTransactions].reverse(),
        feeItems,
        groupFeeItems,
        products,
      ),
      `${year.name}_${csvDate}_${downloadTimestamp()}.csv`,
    );
  };
  const handleYearExport = () => {
    downloadCsv(
      transactionsToCsv(
        [...transactions].reverse(),
        feeItems,
        groupFeeItems,
        products,
      ),
      `${year.name}_全期間_${downloadTimestamp()}.csv`,
    );
  };

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700">
          履歴一覧（{dailyTransactions.length}件）
        </h3>
        <button
          onClick={load}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-200 px-3 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100"
        >
          <ReloadOutlined /> 更新
        </button>
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2.5">
        <DatePicker
          value={csvDate}
          onChange={setCsvDate}
          minDate={year.startDate}
          maxDate={year.endDate}
          size={38}
        />
        <button
          onClick={handleDailyExport}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg border border-neutral-300 px-4 py-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <DownloadOutlined /> この日をCSV出力（{dailyTransactions.length}件）
        </button>
        <button
          onClick={handleYearExport}
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg bg-neutral-900 px-4 py-2 text-sm text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <DownloadOutlined /> {year.name} 全期間をCSV出力
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-neutral-400">読み込み中...</p>
      ) : (
        <ul className="max-h-[32rem] divide-y divide-neutral-100 overflow-y-auto">
          {dailyTransactions.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 py-2.5"
            >
              <div className="flex min-w-0 flex-1 items-baseline gap-3 overflow-hidden">
                <span className="w-18 shrink-0 text-sm font-medium text-neutral-900">
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
                  onClick={() => onEditTransaction(t)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-100"
                  aria-label="編集"
                >
                  <EditOutlined />
                </button>
                <button
                  onClick={() => setDeleteTarget(t)}
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

      {deleteTarget && (
        <ConfirmDeleteModal
          title="履歴の削除"
          message="この履歴を削除しますか？この操作は元に戻せません。"
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </section>
  );
}
