// 取引の購入・受付内容を「ラベル×個数」形式で1行に要約する
// （直近の履歴・履歴一覧の共通表示ロジック）
import type { Transaction } from '@/types'

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
