// ドメインモデルの型定義
// Firestore上のドキュメント構造と対応する

/** 動作環境（本番 / デモ） */
export type EnvName = 'production' | 'demo'

/** 年度（文化祭の開催年） */
export interface YearDoc {
  id: string
  name: string // 表示名（例: "2025"）
  startDate: string // yyyy-mm-dd
  endDate: string // yyyy-mm-dd
  settings: YearSettings
  createdAt: number
}

/** 入場料の項目（大人・学生など。項目数は可変） */
export interface FeeItem {
  id: string
  label: string
  unitPrice: number
  unit: string // 単位表示（例: "名"）
  order: number
}

/** グループ料金の項目（入場料の合計と比較して安い方が適用される。項目数は可変） */
export interface GroupFeeItem {
  id: string
  label: string
  price: number
  unit: string // 単位表示（例: "グループ"）
  order: number
}

/** 物販商品 */
export interface Product {
  id: string
  name: string
  unitPrice: number
  unit: string // 単位表示（例: "個"）
  order: number
}

/** スタッフ（レジ担当者） */
export interface StaffMember {
  id: string
  name: string
  active: boolean
  order: number
}

/** 年度ごとの各種設定 */
export interface YearSettings {
  roomCapacity: number // 教室定員
  colorThresholdMinutes: {
    recent: number // この分数以内は「濃い色」
    mid: number // この分数以内は「薄い色」（超えると通常色）
  }
  occupancyStayMinutes: number // 自動退場までの想定滞在時間
  chartHours: { start: number; end: number } // 棒グラフの既定表示時間（0-24）
  chartMaxCount: number // 棒グラフ縦軸（人数）の固定上限。日付を切り替えてもスケールが変わらないようにする
}

export interface FeeLine {
  itemId: string
  label: string
  unitPrice: number
  qty: number
  subtotal: number
}

export interface GroupLine {
  itemId: string
  label: string
  unitPrice: number
  qty: number
  subtotal: number
}

export interface ProductLine {
  productId: string
  name: string
  unitPrice: number
  qty: number
  subtotal: number
}

/** レジ確定時の取引データ */
export interface Transaction {
  id: string
  date: string // yyyy-mm-dd（確定日。日付範囲クエリ用）
  feeLines: FeeLine[]
  groupLines: GroupLine[]
  feeWaived: boolean
  feeTotal: number
  productLines: ProductLine[]
  productTotal: number
  grandTotal: number
  note: string
  staffId: string
  staffName: string
  entryCount: number // 入場人数（グラフ集計用）
  ticketId: string | null // 整理券経由の場合のみ
  createdAt: number
  updatedAt: number
}

export type TicketStatus = 'pending' | 'settled' | 'deleted'

/** 整理券に保持される保留中の入力内容 */
export interface TicketPendingData {
  feeLines: FeeLine[]
  groupLines: GroupLine[]
  feeWaived: boolean
  productLines: ProductLine[]
  note: string
}

/** 整理券 */
export interface Ticket {
  id: string
  date: string // yyyy-mm-dd（配布日。日付範囲クエリ用）
  serial: string
  arrivalTime: string // hh:mm
  status: TicketStatus
  pendingData: TicketPendingData
  createdAt: number
  settledAt: number | null
  settledTransactionId: string | null
}

/** 教室混雑マップ・棒グラフ用の入場記録（自動退場方式） */
export interface OccupancyEntry {
  id: string
  date: string // yyyy-mm-dd
  entryTime: number // epoch ms
  partySize: number
  transactionId: string
  viaTicket: boolean // 整理券経由の入場かどうか（棒グラフの色分けに使用）
}

export type RegisterSessionType = 'open' | 'close'

/** 紙幣・硬貨の内訳（金種 -> 枚数） */
export type CashBreakdown = Record<string, number>

/** レジ開け・レジ締めの記録 */
export interface RegisterSession {
  id: string
  date: string // yyyy-mm-dd
  type: RegisterSessionType
  staffId: string
  staffName: string
  cashBreakdown: CashBreakdown
  totalAmount: number
  expectedAmount: number | null // レジ締めのみ：開け金額 + 当日売上
  diffFromOpen: number | null // レジ締めのみ：レジ開けとの差額
  diffFromSales: number | null // レジ締めのみ：売上集計との差額
  createdAt: number
}
