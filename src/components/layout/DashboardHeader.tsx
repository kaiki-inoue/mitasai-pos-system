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
}: {
  yearName: string;
  tab: DashboardTabKey;
  onTabChange: (tab: DashboardTabKey) => void;
  staffList: StaffMember[];
}) {
  const { logout, env } = useAuth();

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-3">
          <Link
            to="/"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-100"
          >
            <HomeOutlined />
          </Link>
          <div className="flex items-center gap-2">
            <p className="text-base font-semibold text-neutral-900">
              {yearName}
            </p>
            {env === "demo" && (
              <span className="inline-flex h-6 items-center rounded bg-neutral-200 px-1.5 text-xs font-medium text-neutral-700">
                デモ環境
              </span>
            )}
          </div>
        </div>

        <nav className="flex gap-1 rounded-full bg-neutral-100 p-1">
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

        <div className="flex items-center gap-2">
          <StaffSelector staffList={staffList} />
          <button
            onClick={logout}
            className="flex items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-3 py-2 text-sm text-neutral-600 hover:bg-neutral-100"
          >
            <LogoutOutlined /> ログアウト
          </button>
        </div>
      </div>
    </header>
  );
}
