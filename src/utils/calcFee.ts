// 金額計算ロジック
import type { FeeItem, FeeLine, GroupFeeItem, GroupLine, Product, ProductLine } from '@/types'

export function buildFeeLines(feeItems: FeeItem[], counts: Record<string, number>): FeeLine[] {
  return feeItems.map((item) => {
    const qty = counts[item.id] ?? 0
    return {
      itemId: item.id,
      label: item.label,
      unitPrice: item.unitPrice,
      qty,
      subtotal: item.unitPrice * qty,
    }
  })
}

export function buildGroupLines(groupItems: GroupFeeItem[], counts: Record<string, number>): GroupLine[] {
  return groupItems.map((item) => {
    const qty = counts[item.id] ?? 0
    return {
      itemId: item.id,
      label: item.label,
      unitPrice: item.price,
      qty,
      subtotal: item.price * qty,
    }
  })
}

export function buildProductLines(products: Product[], counts: Record<string, number>): ProductLine[] {
  return products.map((product) => {
    const qty = counts[product.id] ?? 0
    return {
      productId: product.id,
      name: product.name,
      unitPrice: product.unitPrice,
      qty,
      subtotal: product.unitPrice * qty,
    }
  })
}

/**
 * 入場料合計を計算する。
 * グループ料金の入力がある場合のみ「通常合計 vs グループ料金合計」を比較し、安い方を採用する
 * （グループ料金が1件も入力されていないときは単純に通常合計を採用）。
 */
export function calcFeeTotal(feeLines: FeeLine[], groupLines: GroupLine[]): number {
  const normalTotal = feeLines.reduce((sum, line) => sum + line.subtotal, 0)
  const groupTotal = groupLines.reduce((sum, line) => sum + line.subtotal, 0)
  if (groupTotal <= 0) return normalTotal
  return Math.min(normalTotal, groupTotal)
}

export function calcProductTotal(productLines: ProductLine[]): number {
  return productLines.reduce((sum, line) => sum + line.subtotal, 0)
}

/**
 * グラフ・混雑マップ用の入場人数。
 * グループ料金は料金計算専用の項目であり、入場人数のカウントには含めない。
 */
export function calcEntryCount(feeLines: FeeLine[]): number {
  return feeLines.reduce((sum, line) => sum + line.qty, 0)
}
