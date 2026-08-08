// 管理: 物販商品の設定
// 誤操作防止のため、値の編集・並び替えはローカルのドラフトに保持し「変更を保存」でまとめて反映する
// （商品の追加・削除のみ即時反映）
import { useMemo, useState } from "react";
import {
  DeleteOutlined,
  HolderOutlined,
  PlusOutlined,
} from "@ant-design/icons";
import type { EnvName, Product } from "@/types";
import { addProduct, deleteProduct, updateProduct } from "@/lib/dataApi";
import { applyOrder, moveItem, useDragReorder } from "@/hooks/useDragReorder";
import { SaveBar } from "./SaveBar";
import { ConfirmDeleteModal } from "@/components/common/ConfirmDeleteModal";
import { NumberField } from "@/components/common/NumberField";

type ProductDraft = { name: string; unitPrice: number; unit: string };

export function ProductSettings({
  env,
  yearId,
  products,
}: {
  env: EnvName;
  yearId: string;
  products: Product[];
}) {
  const [drafts, setDrafts] = useState<Record<string, ProductDraft>>({});
  // 並び替えドラフト（idの配列）。nullは「並び替えなし＝購読順のまま」
  const [order, setOrder] = useState<string[] | null>(null);
  const [saving, setSaving] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newUnit, setNewUnit] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);

  const orderedProducts = useMemo(
    () => applyOrder(products, order),
    [products, order],
  );

  // ドラッグで元の位置に戻した場合はdirty扱いにしない
  const orderChanged =
    order !== null &&
    orderedProducts.map((p) => p.id).join(",") !==
      products.map((p) => p.id).join(",");
  const dirty = Object.keys(drafts).length > 0 || orderChanged;
  // 商品名と正の金額が入力されて初めて追加できる（0円商品は誤入力とみなす）
  const canAdd = newName.trim() !== "" && Number(newPrice) > 0;

  const dnd = useDragReorder((from, to) =>
    setOrder(
      moveItem(
        orderedProducts.map((p) => p.id),
        from,
        to,
      ),
    ),
  );

  const draftOf = (product: Product): ProductDraft =>
    drafts[product.id] ?? {
      name: product.name,
      unitPrice: product.unitPrice,
      unit: product.unit || "個",
    };

  const updateDraft = (product: Product, patch: Partial<ProductDraft>) =>
    setDrafts((d) => ({
      ...d,
      [product.id]: { ...draftOf(product), ...patch },
    }));

  const handleAdd = async () => {
    if (!canAdd) return;
    await addProduct(env, yearId, {
      name: newName.trim(),
      unitPrice: Number(newPrice),
      unit: newUnit.trim() || "個",
      order: products.length,
    });
    setNewName("");
    setNewPrice("");
    setNewUnit("");
  };

  const handleDelete = async (product: Product) => {
    await deleteProduct(env, yearId, product.id);
    // 削除済み商品のドラフトが残ると保存時に失敗するため破棄する
    setDrafts(({ [product.id]: _removed, ...rest }) => rest);
    setOrder((o) => o?.filter((id) => id !== product.id) ?? null);
    setDeleteTarget(null);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // 値の編集と並び替え（order）を1ドキュメント1回の更新にまとめる
      const patches: Record<string, Partial<Product>> = {};
      Object.entries(drafts).forEach(([id, draft]) => {
        patches[id] = { ...draft };
      });
      if (orderChanged) {
        orderedProducts.forEach((product, index) => {
          if (product.order !== index)
            patches[product.id] = { ...patches[product.id], order: index };
        });
      }
      await Promise.all(
        Object.entries(patches).map(([id, patch]) =>
          updateProduct(env, yearId, id, patch),
        ),
      );
      setDrafts({});
      setOrder(null);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDrafts({});
    setOrder(null);
  };

  return (
    <div className="space-y-6">
      <section className="rounded-xl border border-neutral-200 bg-white p-5">
        <h3 className="mb-3 text-sm font-semibold text-neutral-700">物販</h3>
        <div className="max-[499px]:overflow-x-auto max-[499px]:pb-1">
          <div className="max-[499px]:min-w-[440px]">
            <div className="space-y-2">
              {orderedProducts.map((product, index) => {
                const draft = draftOf(product);
                return (
                  <div
                    key={product.id}
                    {...dnd.rowProps(index)}
                    className={`flex items-center gap-2 max-[499px]:min-w-0 ${dnd.draggingIndex === index ? "opacity-50" : ""}`}
                  >
                    <span
                      {...dnd.handleProps(index)}
                      className="flex h-9 w-6 shrink-0 cursor-grab items-center justify-center text-neutral-300 hover:text-neutral-500 active:cursor-grabbing"
                      aria-label={`${draft.name}を並び替え`}
                    >
                      <HolderOutlined />
                    </span>
                    <input
                      value={draft.name}
                      onChange={(e) =>
                        updateDraft(product, { name: e.target.value })
                      }
                      className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm max-[499px]:min-w-[170px] max-[499px]:flex-[1.5_1_0%]"
                    />
                    <NumberField
                      value={draft.unitPrice}
                      onChange={(unitPrice) =>
                        updateDraft(product, { unitPrice })
                      }
                      className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <span className="shrink-0 text-xs text-neutral-400">
                      円 /
                    </span>
                    <input
                      value={draft.unit}
                      onChange={(e) =>
                        updateDraft(product, { unit: e.target.value })
                      }
                      placeholder="単位"
                      className="w-20 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
                    />
                    <button
                      onClick={() => setDeleteTarget(product)}
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
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="例：持ち帰り謎"
                className="min-w-0 flex-1 rounded-lg border border-neutral-300 px-3 py-2 text-sm max-[499px]:min-w-[170px] max-[499px]:flex-[1.5_1_0%]"
              />
              <input
                type="number"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="500"
                className="w-24 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <span className="shrink-0 text-xs text-neutral-400">円 /</span>
              <input
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
                placeholder="キット"
                className="w-20 rounded-lg border border-neutral-300 px-3 py-2 text-sm"
              />
              <button
                onClick={handleAdd}
                disabled={!canAdd}
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

      {deleteTarget && (
        <ConfirmDeleteModal
          title="商品の削除"
          message={`「${deleteTarget.name}」を削除しますか？この操作は元に戻せません。`}
          onConfirm={() => handleDelete(deleteTarget)}
          onCancel={() => setDeleteTarget(null)}
        />
      )}
    </div>
  );
}
