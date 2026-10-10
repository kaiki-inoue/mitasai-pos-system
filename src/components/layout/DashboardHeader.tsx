// ダッシュボード上部：年度名・タブ切替・担当者選択・ホームへ戻る
import { Link } from "react-router-dom";
import { HomeOutlined, LogoutOutlined } from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import type { StaffMember } from "@/types";
import { StaffSelector } from "./StaffSelector";

export type DashboardTabKey = "register" | "congestion" | "admin";

const TABS: { key: DashboardTabKey; label: string }[] = [
  { key: "register", label: "レジ受付" },
  { key: "congestion", label: "混雑状況" },
  { key: "admin", label: "設定" },
];

export function DashboardHeader({
  yearName,
  tab,
  onTabChange,
  staffList,
  staffListReady,
  staffListError,
}: {
  yearName: string;
  tab: DashboardTabKey;
  onTabChange: (tab: DashboardTabKey) => void;
  staffList: StaffMember[];
  staffListReady: boolean;
  staffListError: boolean;
}) {
  const { logout, env } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto grid max-w-6xl grid-cols-[1fr_auto] items-center gap-2 px-4 py-3 min-[814px]:flex min-[814px]:flex-wrap min-[814px]:justify-between min-[814px]:gap-3">
        <div className="col-start-1 row-start-1 flex min-w-0 items-center gap-1.5 sm:gap-3">
          <Link
            to="/"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-100 sm:h-9 sm:w-9"
          >
            <HomeOutlined />
          </Link>
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <p className="min-w-0 truncate text-sm font-semibold text-neutral-900 sm:text-base">
              {yearName}
            </p>
            {env === "demo" && (
              <span className="inline-flex h-6 shrink-0 items-center rounded bg-neutral-200 px-1.5 text-xs font-medium text-neutral-700">
                デモ環境
              </span>
            )}
          </div>
        </div>

        <nav className="col-span-2 col-start-1 row-start-2 flex justify-self-center gap-1 rounded-full bg-neutral-100 p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => onTabChange(t.key)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                tab === t.key
                  ? "bg-white text-neutral-900 shadow-sm"
                  : "text-neutral-500 hover:text-neutral-800"
              }`}
            >
              {t.label}
            </button>
          ))}
        </nav>

        <div className="col-start-2 row-start-1 flex shrink-0 items-center gap-1.5 sm:gap-2">
          <StaffSelector
            staffList={staffList}
            staffListReady={staffListReady}
            staffListError={staffListError}
          />
          <button
            onClick={logout}
            aria-label="ログアウト"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm"
          >
            <LogoutOutlined />
            <span className="hidden sm:inline">ログアウト</span>
          </button>
        </div>
      </div>
    </header>
  );
}
