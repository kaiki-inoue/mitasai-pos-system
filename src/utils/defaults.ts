// 新規年度作成時の初期データ
import type { YearSettings } from '@/types'

export const defaultGroupFeeItems = [{ label: '家族', price: 1000, unit: '家族', order: 0 }]

export const defaultYearSettings: YearSettings = {
  roomCapacity: 50,
  colorThresholdMinutes: { recent: 30, mid: 60 },
  occupancyStayMinutes: 60,
  chartHours: { start: 9, end: 19 },
  chartMaxCount: 50,
}

export const defaultFeeItems = [
  { label: '大人', unitPrice: 500, unit: '人', order: 0 },
  { label: '学生', unitPrice: 500, unit: '人', order: 1 },
]

export const defaultProducts = [
  { name: '持ち帰り謎', unitPrice: 500, unit: 'キット', order: 0 },
]

export const CASH_DENOMINATIONS = [10000, 5000, 2000, 1000, 500, 100, 50, 10, 5, 1]
