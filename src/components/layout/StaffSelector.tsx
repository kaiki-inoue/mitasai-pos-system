// 現在操作しているスタッフの選択（確定・レジ開閉の記録に使用）
import { useEffect, useRef, useState } from "react";
import { CheckOutlined, DownOutlined, UserOutlined } from "@ant-design/icons";
import { useAuth } from "@/context/AuthContext";
import type { StaffMember } from "@/types";

export function StaffSelector({
  staffList,
  staffListReady,
  staffListError,
}: {
  staffList: StaffMember[];
  staffListReady: boolean;
  staffListError: boolean;
}) {
  const { staff, setStaff } = useAuth();
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeStaff = staffListReady ? staffList.filter((s) => s.active) : [];
  const selected =
    staff && activeStaff.some((s) => s.id === staff.id) ? staff : null;

  useEffect(() => {
    if (!open) return;
    const handleMouseDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handleMouseDown);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleMouseDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [open]);

  const handleSelect = (next: StaffMember) => {
    setStaff(next);
    setOpen(false);
  };

  return (
    <div ref={containerRef} className="relative shrink-0">
      <button
        onClick={() => setOpen((prev) => !prev)}
        disabled={!staffListReady}
        title={
          staffListError
            ? "担当者名簿を確認できません。通信状態を確認してください"
            : undefined
        }
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-label={selected ? undefined : "担当者を選択"}
        className="flex h-8 items-center gap-1.5 rounded-lg border border-neutral-200 bg-white px-2 text-sm text-neutral-700 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-50 sm:h-9 sm:px-2.5"
      >
        <UserOutlined className="shrink-0 text-neutral-400" />
        {selected ? (
          <span className="max-w-20 truncate sm:max-w-none">
            {selected.name}
          </span>
        ) : (
          <span className="hidden text-neutral-400 sm:inline">
            担当者を選択
          </span>
        )}
        <DownOutlined
          className={`!hidden text-[10px] text-neutral-400 transition sm:!inline-block ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="absolute right-0 top-full z-50 mt-1 w-52 rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
          {activeStaff.length === 0 ? (
            <div className="px-3 py-2.5 text-sm">
              <p className="text-neutral-500">担当者が見つかりません</p>
              <p className="mt-1 text-xs text-neutral-400">
                設定 &gt; 担当者名簿 から登録してください
              </p>
            </div>
          ) : (
            <ul role="listbox">
              {activeStaff.map((s) => {
                const isSelected = selected?.id === s.id;
                return (
                  <li key={s.id}>
                    <button
                      role="option"
                      aria-selected={isSelected}
                      onClick={() => handleSelect(s)}
                      className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                        isSelected
                          ? "bg-neutral-900 text-white"
                          : "text-neutral-700 hover:bg-neutral-100"
                      }`}
                    >
                      {s.name}
                      {isSelected && <CheckOutlined className="text-xs" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
