// CSV出力ユーティリティ
import type { FeeItem, GroupFeeItem, Product, Transaction } from '@/types'
import { dateStringFromMs, formatDate, formatTime } from './format'

function escapeCsvCell(value: string | number): string {
  const str = String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

/** ラベルと個数のペア（FeeLine / GroupLine / ProductLine を共通に扱うための最小形） */
interface LabeledQty {
  label: string
  qty: number
}

/** 1取引分の明細を「ラベル -> 個数」のマップにする（同一ラベルが複数行ある場合は合算） */
function qtyByLabel(lines: LabeledQty[]): Map<string, number> {
  const map = new Map<string, number>()
  for (const line of lines) {
    map.set(line.label, (map.get(line.label) ?? 0) + line.qty)
  }
  return map
}

export function transactionsToCsv(
  transactions: Transaction[],
  feeItems: FeeItem[],
  groupFeeItems: GroupFeeItem[],
  products: Product[],
): string {
  const feeLines = (t: Transaction): LabeledQty[] => t.feeLines
  const groupLines = (t: Transaction): LabeledQty[] => t.groupLines
  const productLines = (t: Transaction): LabeledQty[] =>
    t.productLines.map((l) => ({ label: l.name, qty: l.qty }))

  // 列構成は「設定 > レジ受付」に登録されているマスタの並び順で固定する（入場料金 → グループ料金 → 物販の順）。
  // 出力対象の取引データから動的に集めると、出力するデータによって列の有無・順序が変わってしまうため
  const feeLabels = [...feeItems].sort((a, b) => a.order - b.order).map((i) => i.label)
  const groupLabels = [...groupFeeItems].sort((a, b) => a.order - b.order).map((i) => i.label)
  const productLabels = [...products].sort((a, b) => a.order - b.order).map((i) => i.name)

  const header = [
    '日付',
    '時刻',
    '担当者',
    ...feeLabels,
    ...groupLabels,
    ...productLabels,
    '料金徴収なし',
    '入場料合計金額',
    '物販合計金額',
    '合計金額',
    '入場人数',
    '備考',
  ]

  const rows = transactions.map((t) => {
    const feeQty = qtyByLabel(feeLines(t))
    const groupQty = qtyByLabel(groupLines(t))
    const productQty = qtyByLabel(productLines(t))

    return [
      formatDate(dateStringFromMs(t.createdAt)),
      formatTime(t.createdAt),
      t.staffName,
      // その取引に無い項目は空欄ではなく0を入れる（表計算での集計を扱いやすくするため）
      ...feeLabels.map((label) => feeQty.get(label) ?? 0),
      ...groupLabels.map((label) => groupQty.get(label) ?? 0),
      ...productLabels.map((label) => productQty.get(label) ?? 0),
      t.feeWaived ? 'あり' : '',
      t.feeTotal,
      t.productTotal,
      t.grandTotal,
      t.entryCount,
      t.note,
    ]
  })

  return [header, ...rows].map((row) => row.map(escapeCsvCell).join(',')).join('\r\n')
}

export function downloadCsv(csv: string, filename: string) {
  // 先頭にBOMを付与し、Excelで開いた際の文字化けを防ぐ
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}
