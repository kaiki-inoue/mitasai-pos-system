// 管理: 入場料金・グループ料金の設定
// 誤操作防止のため、値の編集・並び替えはローカルのドラフトに保持し「変更を保存」でまとめて反映する
// （項目の追加・削除のみ即時反映）
import { useMemo, useState } from "react";
import {
  DeleteOutlined,
  HolderOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { EnvName, FeeItem, GroupFeeItem } from "@/types";
import {
  addFeeItem,
  addGroupFeeItem,
  deleteFeeItem,
  deleteGroupFeeItem,
  updateFeeItem,
  updateGroupFeeItem,
} from "@/lib/dataApi";
import { useGroupFeeItems } from "@/hooks/useYearData";
import { applyOrder, moveItem, useDragReorder } from "@/hooks/useDragReorder";
import { SaveBar } from "./SaveBar";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";
import { NumberField } from "@/components/common/NumberField";

type FeeItemDraft = { label: string; unitPrice: number; unit: string };
type GroupItemDraft = { label: string; price: number; unit: string };

export function FeeSettings({
  env,
  yearId,
  feeItems,
}: {
  env: EnvName;
  yearId: string;
  feeItems: FeeItem[];
}) {
  const { data: groupItems } = useGroupFeeItems(env, yearId);

  const [feeDrafts, setFeeDrafts] = useState<Record<string, FeeItemDraft>>({});
  const [groupDrafts, setGroupDrafts] = useState<
    Record<string, GroupItemDraft>
  >({});
  // 並び替えドラフト（idの配列）。nullは「並び替えなし＝購読順のまま」
  const [feeOrder, setFeeOrder] = useState<string[] | null>(null);
  const [groupOrder, setGroupOrder] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);

  const [newFeeLabel, setNewFeeLabel] = useState("");
  const [newFeePrice, setNewFeePrice] = useState("");
  const [newFeeUnit, setNewFeeUnit] = useState("");
  const [newGroupLabel, setNewGroupLabel] = useState("");
  const [newGroupPrice, setNewGroupPrice] = useState("");
  const [newGroupUnit, setNewGroupUnit] = useState("");

  const [feeDeleteTarget, setFeeDeleteTarget] = useState<FeeItem | null>(null);
  const [groupDeleteTarget, setGroupDeleteTarget] =
    useState<GroupFeeItem | null>(null);

  const orderedFeeItems = useMemo(
    () => applyOrder(feeItems, feeOrder),
    [feeItems, feeOrder],
  );
  const orderedGroupItems = useMemo(
    () => applyOrder(groupItems, groupOrder),
    [groupItems, groupOrder],
  );

  // ドラッグで元の位置に戻した場合はdirty扱いにしない
  const feeOrderChanged =
    feeOrder !== null &&
    orderedFeeItems.map((i) => i.id).join(",") !==
      feeItems.map((i) => i.id).join(",");
  const groupOrderChanged =
    groupOrder !== null &&
    orderedGroupItems.map((i) => i.id).join(",") !==
      groupItems.map((i) => i.id).join(",");

  const dirty =
    Object.keys(feeDrafts).length > 0 ||
    Object.keys(groupDrafts).length > 0 ||
    feeOrderChanged ||
    groupOrderChanged;

  // ラベルと正の金額が入力されて初めて追加できる（0円項目は誤入力とみなす）
  const canAddFee = newFeeLabel.trim() !== "" && Number(newFeePrice) > 0;
  const canAddGroup = newGroupLabel.trim() !== "" && Number(newGroupPrice) > 0;

  const feeDnd = useDragReorder((from, to) =>
    setFeeOrder(
      moveItem(
        orderedFeeItems.map((i) => i.id),
        from,
        to,
      ),
    ),
  );
  const groupDnd = useDragReorder((from, to) =>
    setGroupOrder(
      moveItem(
        orderedGroupItems.map((i) => i.id),
        from,
        to,
      ),
    ),
  );

  const feeDraftOf = (item: FeeItem): FeeItemDraft =>
    feeDrafts[item.id] ?? {
      label: item.label,
      unitPrice: item.unitPrice,
      unit: item.unit || "人",
    };
  const groupDraftOf = (item: GroupFeeItem): GroupItemDraft =>
    groupDrafts[item.id] ?? {
      label: item.label,
      price: item.price,
      unit: item.unit || "グループ",
    };

  const updateFeeDraft = (item: FeeItem, patch: Partial<FeeItemDraft>) =>
    setFeeDrafts((d) => ({
      ...d,
      [item.id]: { ...feeDraftOf(item), ...patch },
    }));
  const updateGroupDraft = (
    item: GroupFeeItem,
    patch: Partial<GroupItemDraft>,
  ) =>
    setGroupDrafts((d) => ({
      ...d,
      [item.id]: { ...groupDraftOf(item), ...patch },
    }));

  const handleAddFee = async () => {
    if (!canAddFee) return;
    await addFeeItem(env, yearId, {
      label: newFeeLabel.trim(),
      unitPrice: Number(newFeePrice),
      unit: newFeeUnit.trim() || "人",
      order: feeItems.length,
    });
    setNewFeeLabel("");
    setNewFeePrice("");
    setNewFeeUnit("");
  };

  const handleAddGroup = async () => {
    if (!canAddGroup) return;
    await addGroupFeeItem(env, yearId, {
      label: newGroupLabel.trim(),
      price: Number(newGroupPrice),
      unit: newGroupUnit.trim() || "グループ",
      order: groupItems.length,
    });
    setNewGroupLabel("");
    setNewGroupPrice("");
    setNewGroupUnit("");
  };

  const handleDeleteFee = async (item: FeeItem) => {
    await deleteFeeItem(env, yearId, item.id);
    // 削除済み項目のドラフトが残ると保存時に失敗するため破棄する
    setFeeDrafts(({ [item.id]: _removed, ...rest }) => rest);
    setFeeOrder((order) => order?.filter((id) => id !== item.id) ?? null);
    setFeeDeleteTarget(null);
  };

  const handleDeleteGroup = async (item: GroupFeeItem) => {
    await deleteGroupFeeItem(env, yearId, item.id);
    setGroupDrafts(({ [item.id]: _removed, ...rest }) => rest);
    setGroupOrder((order) => order?.filter((id) => id !== item.id) ?? null);
    setGroupDeleteTarget(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 値の編集と並び替え（order）を1ドキュメント1回の更新にまとめる
      const feePatches: Record<string, Partial<FeeItem>> = {};
      Object.entries(feeDrafts).forEach(([id, draft]) => {
        feePatches[id] = { ...draft };
      });
      if (feeOrderChanged) {
        orderedFeeItems.forEach((item, index) => {
          if (item.order !== index)
            feePatches[item.id] = { ...feePatches[item.id], order: index };
        });
      }
      const groupPatches: Record<string, Partial<GroupFeeItem>> = {};
      Object.entries(groupDrafts).forEach(([id, draft]) => {
        groupPatches[id] = { ...draft };
      });
      if (groupOrderChanged) {
        orderedGroupItems.forEach((item, index) => {
          if (item.order !== index)
            groupPatches[item.id] = { ...groupPatches[item.id], order: index };
        });
      }
      await Promise.all([
        ...Object.entries(feePatches).map(([id, patch]) =>
          updateFeeItem(env, yearId, id, patch),
        ),
        ...Object.entries(groupPatches).map(([id, patch]) =>
          updateGroupFeeItem(env, yearId, id, patch),
        ),
      ]);
      setFeeDrafts({});
      setGroupDrafts({});
      setFeeOrder(null);
      setGroupOrder(null);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setFeeDrafts({});
    setGroupDrafts({});
    setFeeOrder(null);
    setGroupOrder(null);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-neutral-700">
          入場料金
        </h3>
        <div className="max-[499px]:overflow-x-auto max-[499px]:pb-1">
          <div className="max-[499px]:min-w-[440px]">
            <div className="space-y-2">
              {orderedFeeItems.map((item, index) => {
                const draft = feeDraftOf(item);
                return (
                  <div
                    key={item.id}
                    {...feeDnd.rowProps(index)}
                    className={`flex items-center gap-2 max-[499px]:min-w-0 ${feeDnd.draggingIndex === index ? "opacity-50" : ""}`}
                  >
                    <span
                      {...feeDnd.handleProps(index)}
                      className="flex h-9 w-6 shrink-0 cursor-grab items-center justify-center text-neutral-300 hover:text-neutral-500 active:cursor-grabbing"
                      aria-label={`${draft.label}を並び替え`}
                    >
                      <HolderOutlined />
                    </span>
                    <input
                      value={draft.label}
                      onChange={(e) =>
                        updateFeeDraft(item, { label: e.target.value })
                      }
                      className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm max-[499px]:min-w-[170px] max-[499px]:flex-[1.5_1_0%]"
                    />
                    <NumberField
                      value={draft.unitPrice}
                      onChange={(unitPrice) =>
                        updateFeeDraft(item, { unitPrice })
                      }
                      className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <span className="shrink-0 text-xs text-neutral-400">
                      円 /
                    </span>
                    <input
                      value={draft.unit}
                      onChange={(e) =>
                        updateFeeDraft(item, { unit: e.target.value })
                      }
                      placeholder="単位"
                      className="w-20 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => setFeeDeleteTarget(item)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:bg-neutral-100"
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-2 pl-8">
              <input
                value={newFeeLabel}
                onChange={(e) => setNewFeeLabel(e.target.value)}
                placeholder="例：大人"
                className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm max-[499px]:min-w-[170px] max-[499px]:flex-[1.5_1_0%]"
              />
              <input
                type="number"
                value={newFeePrice}
                onChange={(e) => setNewFeePrice(e.target.value)}
                placeholder="500"
                className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <span className="shrink-0 text-xs text-neutral-400">円 /</span>
              <input
                value={newFeeUnit}
                onChange={(e) => setNewFeeUnit(e.target.value)}
                placeholder="人"
                className="w-20 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                onClick={handleAddFee}
                disabled={!canAddFee}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <PlusOutlined />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-neutral-700">
          グループ料金
        </h3>
        <p className="mb-3 text-xs text-neutral-400">
          入場料の合計額とグループ料金の合計額を比較し、より安い料金を適用します。
        </p>
        <div className="max-[499px]:overflow-x-auto max-[499px]:pb-1">
          <div className="max-[499px]:min-w-[440px]">
            <div className="space-y-2">
              {orderedGroupItems.map((item, index) => {
                const draft = groupDraftOf(item);
                return (
                  <div
                    key={item.id}
                    {...groupDnd.rowProps(index)}
                    className={`flex items-center gap-2 max-[499px]:min-w-0 ${groupDnd.draggingIndex === index ? "opacity-50" : ""}`}
                  >
                    <span
                      {...groupDnd.handleProps(index)}
                      className="flex h-9 w-6 shrink-0 cursor-grab items-center justify-center text-neutral-300 hover:text-neutral-500 active:cursor-grabbing"
                      aria-label={`${draft.label}を並び替え`}
                    >
                      <HolderOutlined />
                    </span>
                    <input
                      value={draft.label}
                      onChange={(e) =>
                        updateGroupDraft(item, { label: e.target.value })
                      }
                      className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm max-[499px]:min-w-[170px] max-[499px]:flex-[1.5_1_0%]"
                    />
                    <NumberField
                      value={draft.price}
                      onChange={(price) => updateGroupDraft(item, { price })}
                      className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <span className="shrink-0 text-xs text-neutral-400">
                      円 /
                    </span>
                    <input
                      value={draft.unit}
                      onChange={(e) =>
                        updateGroupDraft(item, { unit: e.target.value })
                      }
                      placeholder="単位"
                      className="w-20 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => setGroupDeleteTarget(item)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-neutral-200 text-neutral-400 hover:bg-neutral-100"
                    >
                      <DeleteOutlined />
                    </button>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 flex items-center gap-2 pl-8">
              <input
                value={newGroupLabel}
                onChange={(e) => setNewGroupLabel(e.target.value)}
                placeholder="例：家族"
                className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm max-[499px]:min-w-[170px] max-[499px]:flex-[1.5_1_0%]"
              />
              <input
                type="number"
                value={newGroupPrice}
                onChange={(e) => setNewGroupPrice(e.target.value)}
                placeholder="1000"
                className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <span className="shrink-0 text-xs text-neutral-400">円 /</span>
              <input
                value={newGroupUnit}
                onChange={(e) => setNewGroupUnit(e.target.value)}
                placeholder="家族"
                className="w-20 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                onClick={handleAddGroup}
                disabled={!canAddGroup}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-neutral-900 text-white hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <PlusOutlined />
              </button>
            </div>
          </div>
        </div>
      </section>

      <SaveBar
        dirty={dirty}
        saving={saving}
        onSave={handleSave}
        onCancel={handleCancel}
      />

      {feeDeleteTarget && (
        <ConfirmDeleteModal
          title="入場料金項目の削除"
          message={`「${feeDeleteTarget.label}」を削除しますか？この操作は元に戻せません。`}
          onConfirm={() => handleDeleteFee(feeDeleteTarget)}
          onCancel={() => setFeeDeleteTarget(null)}
        />
      )}

      {groupDeleteTarget && (
        <ConfirmDeleteModal
          title="グループ料金項目の削除"
          message={`「${groupDeleteTarget.label}」を削除しますか？この操作は元に戻せません。`}
          onConfirm={() => handleDeleteGroup(groupDeleteTarget)}
          onCancel={() => setGroupDeleteTarget(null)}
        />
      )}
    </div>
  );
}
