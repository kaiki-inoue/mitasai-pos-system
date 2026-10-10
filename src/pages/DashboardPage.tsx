// ダッシュボード画面：金額計算・混雑状況・管理をタブで切り替える
import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import {
  useFeeItems,
  useGroupFeeItems,
  usePendingTickets,
  useProducts,
  useRecentTransactions,
  useStaffList,
  useYear,
} from "@/hooks/useYearData";
import {
  DashboardHeader,
  type DashboardTabKey,
} from "@/components/layout/DashboardHeader";
import { RegisterTab } from "@/components/register/RegisterTab";
import { CongestionTab } from "@/components/congestion/CongestionTab";
import { AdminTab, type AdminSectionKey } from "@/components/admin/AdminTab";
import type { Transaction } from "@/types";

export function DashboardPage() {
  const { yearId } = useParams<{ yearId: string }>();
  const { env, staff, setStaff } = useAuth();
  const [tab, setTab] = useState<DashboardTabKey>("register");
  const [onboardingDismissed, setOnboardingDismissed] = useState(false);
  // 設定タブ内の表示セクション（履歴一覧からのタブ間遷移のためここで管理する）
  const [adminSection, setAdminSection] = useState<AdminSectionKey>("fee");
  // 履歴一覧からレジ受付タブへ渡す編集対象の取引（RegisterTabが消費したらnullに戻す）
  const [editTransaction, setEditTransaction] = useState<Transaction | null>(
    null,
  );

  const { data: year, loading } = useYear(env, yearId ?? null);
  const { data: feeItems } = useFeeItems(env, yearId ?? null);
  const { data: groupItems } = useGroupFeeItems(env, yearId ?? null);
  const { data: products } = useProducts(env, yearId ?? null);
  const {
    data: staffList,
    loading: staffListLoading,
    error: staffListError,
  } = useStaffList(env, yearId ?? null);
  const { data: recentTransactions } = useRecentTransactions(
    env,
    yearId ?? null,
  );
  const { data: pendingTickets } = usePendingTickets(env, yearId ?? null);

  const staffListReady = !staffListLoading && !staffListError;
  const validStaff = staffListReady
    ? (staffList.find((member) => member.id === staff?.id && member.active) ??
      null)
    : null;

  useEffect(() => {
    if (!staff || staffListLoading) return;
    if (
      staffListError ||
      !staffList.some((member) => member.id === staff.id && member.active)
    ) {
      setStaff(null);
    }
  }, [staff, staffList, staffListLoading, staffListError, setStaff]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center text-neutral-400">
        読み込み中...
      </div>
    );
  }
  if (!env || !yearId || !year) {
    return (
      <div className="flex min-h-screen items-center justify-center text-neutral-400">
        年度が見つかりません
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-neutral-50">
      <DashboardHeader
        yearName={year.name}
        tab={tab}
        onTabChange={setTab}
        staffList={staffList}
        staffListReady={staffListReady}
        staffListError={Boolean(staffListError)}
      />

      <main className="mx-auto max-w-6xl px-4 py-6">
        {tab === "register" && (
          <RegisterTab
            env={env}
            yearId={yearId}
            staff={validStaff}
            staffListReady={staffListReady}
            feeItems={feeItems}
            products={products}
            groupItems={groupItems}
            settings={year.settings}
            recentTransactions={recentTransactions}
            pendingTickets={pendingTickets}
            externalEditTarget={editTransaction}
            onExternalEditConsumed={() => setEditTransaction(null)}
            onViewFullHistory={() => {
              setAdminSection("history");
              setTab("admin");
            }}
          />
        )}
        {tab === "congestion" && <CongestionTab env={env} year={year} />}
        {tab === "admin" && (
          <AdminTab
            env={env}
            year={year}
            feeItems={feeItems}
            groupItems={groupItems}
            products={products}
            staffList={staffList}
            staff={validStaff}
            staffListReady={staffListReady}
            section={adminSection}
            onSectionChange={setAdminSection}
            onEditTransaction={(t) => {
              setEditTransaction(t);
              setTab("register");
            }}
          />
        )}
      </main>

      {staffListReady && !validStaff && !onboardingDismissed && (
        <OnboardingModal onClose={() => setOnboardingDismissed(true)} />
      )}
    </div>
  );
}

// 担当者未選択のまま開いたときに操作手順を案内するモーダル
function OnboardingModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-2 text-lg font-semibold text-neutral-900">
          担当者を選択してください
        </h2>
        <p className="mb-5 text-sm text-neutral-600">
          まずは画面右上の担当者選択からご自身の名前を選択してください。
          <br />
          ご自身の名前が一覧にない場合は、「設定」→「担当者名簿」から名前を登録してください。
        </p>
        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            わかりました
          </button>
        </div>
      </div>
    </div>
  );
}
