// 管理タブ：各種設定・レジ開け締め・担当者名簿・履歴一覧（CSV出力含む）・年度管理をまとめる
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type {
  EnvName,
  FeeItem,
  GroupFeeItem,
  Product,
  StaffMember,
  Transaction,
  YearDoc,
} from "@/types";
import { deleteYear, updateYearInfo } from "@/lib/dataApi";
import { FeeSettings } from "./FeeSettings";
import { ProductSettings } from "./ProductSettings";
import { OccupancySettings } from "./OccupancySettings";
import { StaffSettings } from "./StaffSettings";
import { RegisterSessionPanel } from "./RegisterSessionPanel";
import { FullHistory } from "./FullHistory";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";
import { DatePicker } from "@/components/common/DatePicker";
import { SaveBar } from "./SaveBar";

const SECTIONS = [
  { key: "fee", label: "レジ受付" },
  { key: "occupancy", label: "混雑状況" },
  { key: "register", label: "レジ開け・締め" },
  { key: "staff", label: "担当者名簿" },
  { key: "history", label: "履歴一覧" },
  { key: "danger", label: "年度管理" },
] as const;

export type AdminSectionKey = (typeof SECTIONS)[number]["key"];

interface Props {
  env: EnvName;
  year: YearDoc;
  feeItems: FeeItem[];
  groupItems: GroupFeeItem[];
  products: Product[];
  staffList: StaffMember[];
  section: AdminSectionKey;
  onSectionChange: (section: AdminSectionKey) => void;
  onEditTransaction: (t: Transaction) => void;
}

export function AdminTab({
  env,
  year,
  feeItems,
  groupItems,
  products,
  staffList,
  section,
  onSectionChange,
  onEditTransaction,
}: Props) {
  const navigate = useNavigate();
  const [confirmingYearDelete, setConfirmingYearDelete] = useState(false);
  const [deletingYear, setDeletingYear] = useState(false);

  const handleDeleteYear = async () => {
    setDeletingYear(true);
    try {
      await deleteYear(env, year.id);
      navigate("/");
    } finally {
      setDeletingYear(false);
    }
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap gap-2">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            onClick={() => onSectionChange(s.key)}
            className={`rounded-full px-4 py-1.5 text-sm transition ${
              section === s.key
                ? "bg-neutral-900 text-white"
                : "border border-neutral-200 text-neutral-600 hover:bg-neutral-100"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {section === "fee" && (
        <div className="space-y-6">
          <FeeSettings env={env} yearId={year.id} feeItems={feeItems} />
          <ProductSettings env={env} yearId={year.id} products={products} />
        </div>
      )}
      {section === "occupancy" && (
        <OccupancySettings
          env={env}
          yearId={year.id}
          settings={year.settings}
        />
      )}
      {section === "register" && <RegisterSessionPanel env={env} year={year} />}
      {section === "staff" && (
        <StaffSettings env={env} yearId={year.id} staffList={staffList} />
      )}
      {section === "history" && (
        <FullHistory
          env={env}
          year={year}
          feeItems={feeItems}
          groupFeeItems={groupItems}
          products={products}
          onEditTransaction={onEditTransaction}
        />
      )}
      {section === "danger" && (
        <div className="space-y-6 pb-20">
          <YearInfoCard env={env} year={year} />

          <section className="rounded-xl border border-red-200 bg-white p-5">
            <h3 className="mb-1 text-sm font-semibold text-red-600">
              この年度のデータをすべて削除
            </h3>
            <p className="mb-4 text-xs text-neutral-500">
              {year.name}
              の入場料項目・グループ料金・商品・担当者・取引履歴・整理券・入場記録・レジ開け締め記録を含む
              すべてのデータを完全に削除します。この操作は元に戻せません。
            </p>
            {deletingYear ? (
              <p className="text-sm text-neutral-500">
                削除中です。しばらくお待ちください...
              </p>
            ) : (
              <button
                onClick={() => setConfirmingYearDelete(true)}
                className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700"
              >
                データを削除
              </button>
            )}
          </section>
        </div>
      )}

      {confirmingYearDelete && (
        <ConfirmDeleteModal
          title={`${year.name}の削除`}
          message={`${year.name}のすべてのデータを完全に削除します。この操作は元に戻せません。`}
          requireTypedText="削除"
          onConfirm={async () => {
            setConfirmingYearDelete(false);
            await handleDeleteYear();
          }}
          onCancel={() => setConfirmingYearDelete(false)}
        />
      )}
    </div>
  );
}

// 年度情報（タイトル・開始日・終了日）の編集フォーム。
// 他の設定画面と同じく、変更はローカルのドラフトに保持し共通の保存バー（SaveBar）でまとめて反映する
function YearInfoCard({ env, year }: { env: EnvName; year: YearDoc }) {
  const [name, setName] = useState(year.name);
  const [startDate, setStartDate] = useState(year.startDate);
  const [endDate, setEndDate] = useState(year.endDate);
  const [saving, setSaving] = useState(false);

  const dirty =
    name.trim() !== year.name ||
    startDate !== year.startDate ||
    endDate !== year.endDate;
  const dateInvalid = startDate > endDate;
  const nameEmpty = name.trim().length === 0;

  const handleSave = async () => {
    // バリデーションNGの間は保存しない（エラーメッセージを表示したままにする）
    if (saving || nameEmpty || dateInvalid) return;
    setSaving(true);
    try {
      await updateYearInfo(env, year.id, {
        name: name.trim(),
        startDate,
        endDate,
      });
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setName(year.name);
    setStartDate(year.startDate);
    setEndDate(year.endDate);
  };

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <h3 className="mb-4 text-sm font-semibold text-neutral-700">年度情報</h3>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
        <label className="block w-full text-sm sm:w-62.5">
          <span className="mb-1 block text-xs text-neutral-500">タイトル</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm focus:border-neutral-900 focus:outline-none"
            placeholder="例: 2026"
          />
        </label>
        <div className="text-sm">
          <span className="mb-1 block text-xs text-neutral-500">開始日</span>
          <DatePicker value={startDate} onChange={setStartDate} size={38} />
        </div>
        <div className="text-sm">
          <span className="mb-1 block text-xs text-neutral-500">終了日</span>
          <DatePicker value={endDate} onChange={setEndDate} size={38} />
        </div>
      </div>
      {dateInvalid && (
        <p className="mt-2 text-xs text-red-600">
          開始日は終了日以前の日付にしてください
        </p>
      )}
      {dirty && nameEmpty && (
        <p className="mt-2 text-xs text-red-600">タイトルを入力してください</p>
      )}

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onCancel={handleCancel}
      />
    </section>
  );
}
