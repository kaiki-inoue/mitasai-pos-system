// 取引の購入・受付内容を「ラベル×個数」形式で1行に要約する
// （直近の履歴・履歴一覧の共通表示ロジック）
import type { Transaction } from '@/types'

export interface TransactionTotals {
  feeCounts: Record<string, number>
  groupCounts: Record<string, number>
  productCounts: Record<string, number>
  visitorCount: number
  entranceSales: number
  productSales: number
  totalSales: number
}

export function calculateTransactionTotals(
  transactions: Transaction[],
): TransactionTotals {
  const totals: TransactionTotals = {
    feeCounts: {},
    groupCounts: {},
    productCounts: {},
    visitorCount: 0,
    entranceSales: 0,
    productSales: 0,
    totalSales: 0,
  }

  transactions.forEach((transaction) => {
    transaction.feeLines.forEach((line) => {
      totals.feeCounts[line.itemId] =
        (totals.feeCounts[line.itemId] ?? 0) + line.qty
    })
    transaction.groupLines.forEach((line) => {
      totals.groupCounts[line.itemId] =
        (totals.groupCounts[line.itemId] ?? 0) + line.qty
    })
    transaction.productLines.forEach((line) => {
      totals.productCounts[line.productId] =
        (totals.productCounts[line.productId] ?? 0) + line.qty
    })
    totals.visitorCount += transaction.entryCount
    totals.entranceSales += transaction.feeTotal
    totals.productSales += transaction.productTotal
    totals.totalSales += transaction.grandTotal
  })

  return totals
}

export function summarizeTransactionItems(
  t: Pick<Transaction, 'feeLines' | 'groupLines' | 'productLines'>,
): string {
  const parts: string[] = []
  t.feeLines.forEach((l) => {
    if (l.qty > 0) parts.push(`${l.label}×${l.qty}`)
  })
  t.groupLines.forEach((l) => {
    if (l.qty > 0) parts.push(`${l.label}×${l.qty}`)
  })
  t.productLines.forEach((l) => {
    if (l.qty > 0) parts.push(`${l.name}×${l.qty}`)
  })
  return parts.join('、')
}
