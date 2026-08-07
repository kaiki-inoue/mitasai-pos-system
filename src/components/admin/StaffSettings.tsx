// 管理: レジ担当者（スタッフ）の登録
import { useState } from "react";
import { DeleteOutlined, PlusOutlined } from "@ant-design/icons";
import type { EnvName, StaffMember } from "@/types";
import { addStaff, deleteStaff, updateStaff } from "@/lib/dataApi";
import { useAuth } from "@/context/AuthContext";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";

export function StaffSettings({
  env,
  yearId,
  staffList,
}: {
  env: EnvName;
  yearId: string;
  staffList: StaffMember[];
}) {
  const { staff: currentStaff, setStaff } = useAuth();
  const [newName, setNewName] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<StaffMember | null>(null);

  const handleAdd = async () => {
    if (!newName.trim()) return;
    await addStaff(env, yearId, newName.trim());
    setNewName("");
  };

  const handleDelete = async (member: StaffMember) => {
    await deleteStaff(env, yearId, member.id);
    if (currentStaff?.id === member.id) setStaff(null);
    setDeleteTarget(null);
  };

  return (
    <section className="rounded-xl border border-neutral-200 bg-white p-5">
      <h3 className="mb-1 text-sm font-semibold text-neutral-700">
        利用者（レジ担当者）
      </h3>
      <ul className="mb-3 divide-y divide-neutral-100">
        {staffList.map((member) => (
          <li
            key={member.id}
            className="flex items-center justify-between py-2"
          >
            <span className="text-sm text-neutral-800">{member.name}</span>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-1.5 text-sm text-neutral-500">
                <input
                  type="checkbox"
                  checked={member.active}
                  onChange={(e) =>
                    updateStaff(env, yearId, member.id, {
                      active: e.target.checked,
                    })
                  }
                />
                稼働中
              </label>
              <button
                onClick={() => setDeleteTarget(member)}
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:bg-neutral-100"
              >
                <DeleteOutlined />
              </button>
            </div>
          </li>
        ))}
      </ul>
      <div className="flex items-center gap-2">
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder="氏名"
          className="flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
        />
        <button
          onClick={handleAdd}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-neutral-900 text-white hover:bg-neutral-700"
        >
          <PlusOutlined />
        </button>
      </div>

      {deleteTarget && (
        <ConfirmDeleteModal
          title="担当者の削除"
          message={`${deleteTarget.name} を削除しますか？この操作は元に戻せません。`}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </section>
  );
}
