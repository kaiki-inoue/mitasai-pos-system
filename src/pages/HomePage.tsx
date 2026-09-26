// ホーム画面: 年度の一覧表示・新規作成
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  PlusOutlined,
  CalendarOutlined,
  LogoutOutlined,
} from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import { useYears } from "@/hooks/useYearData";
import { createYear } from "@/lib/dataApi";
import { formatDate } from "@/utils/format";
import { DatePicker } from "@/components/common/DatePicker";

export function HomePage() {
  const { env, logout } = useAuth();
  const { data: years, loading } = useYears(env);
  const navigate = useNavigate();
  const [creating, setCreating] = useState(false);

  return (
    <div className="min-h-screen bg-neutral-50 px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-2">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-2">
            <h1 className="min-w-0 flex-1 truncate text-lg font-semibold text-neutral-900 sm:text-2xl">
              文化祭受付システム
            </h1>
            {env === "demo" && (
              <span className="inline-flex h-6 shrink-0 items-center rounded-md bg-neutral-200 px-1.5 text-xs font-medium text-neutral-700 sm:h-7 sm:px-2.5 sm:text-sm">
                デモ環境
              </span>
            )}
          </div>
          <button
            onClick={logout}
            aria-label="ログアウト"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-neutral-200 bg-white text-neutral-600 hover:bg-neutral-100 sm:h-auto sm:w-auto sm:gap-1.5 sm:px-3 sm:py-2 sm:text-sm"
          >
            <LogoutOutlined />
            <span className="hidden sm:inline">ログアウト</span>
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {years.map((year) => (
            <button
              key={year.id}
              onClick={() => navigate(`/${year.id}`)}
              className="flex items-center gap-3 rounded-xl border border-neutral-200 bg-white p-5 text-left shadow-sm transition hover:border-neutral-400 hover:shadow-md"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-900 text-white">
                <CalendarOutlined />
              </div>
              <div>
                <p className="font-semibold text-neutral-900">{year.name}</p>
                <p className="text-xs text-neutral-500">
                  {formatDate(year.startDate)} 〜 {formatDate(year.endDate)}
                </p>
              </div>
            </button>
          ))}

          <NewYearCard onCreate={() => setCreating(true)} />
        </div>

        {!loading && years.length === 0 && (
          <p className="mt-6 text-center text-sm text-neutral-400">
            まだ年度が登録されていません。「新規作成」から始めてください。
          </p>
        )}
      </div>

      {creating && env && (
        <NewYearModal
          env={env}
          onClose={() => setCreating(false)}
          onCreated={(id) => navigate(`/${id}`)}
        />
      )}
    </div>
  );
}

function NewYearCard({ onCreate }: { onCreate: () => void }) {
  return (
    <button
      onClick={onCreate}
      className="flex h-20.5 items-center justify-center gap-2 rounded-xl border-2 border-dashed border-neutral-300 p-5 text-neutral-500 transition hover:border-neutral-400 hover:text-neutral-700"
    >
      <PlusOutlined /> 新規作成
    </button>
  );
}

function NewYearModal({
  env,
  onClose,
  onCreated,
}: {
  env: NonNullable<ReturnType<typeof useAuth>["env"]>;
  onClose: () => void;
  onCreated: (id: string) => void;
}) {
  const [name, setName] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const isDateRangeInvalid = Boolean(
    startDate && endDate && startDate > endDate,
  );
  const canSubmit = Boolean(
    name.trim() && startDate && endDate && startDate <= endDate,
  );

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSubmitting(true);
    try {
      const id = await createYear(env, name.trim(), startDate, endDate);
      onCreated(id);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-neutral-900">
          新規作成
        </h2>
        <label className="mb-3 block text-sm">
          <span className="mb-1 block text-neutral-600">タイトル</span>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例：○○祭2026"
            className="w-full rounded-lg border border-neutral-300 px-3 py-2 placeholder:text-neutral-400 focus:border-neutral-900 focus:outline-none"
          />
        </label>
        <div className="mb-3 text-sm">
          <span className="mb-1 block text-neutral-600">開始日</span>
          <DatePicker
            value={startDate}
            onChange={setStartDate}
            maxDate={endDate || undefined}
          />
        </div>
        <div className="mb-2 text-sm">
          <span className="mb-1 block text-neutral-600">終了日</span>
          <DatePicker
            value={endDate}
            onChange={setEndDate}
            minDate={startDate || undefined}
          />
        </div>
        {isDateRangeInvalid && (
          <p className="mb-3 text-sm text-red-600">
            終了日は開始日以降の日付を選択してください
          </p>
        )}
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            キャンセル
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !canSubmit}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            作成する
          </button>
        </div>
      </div>
    </div>
  );
}
