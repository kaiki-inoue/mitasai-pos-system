// 表示用フォーマット関数
export function formatYen(amount: number): string {
  return `¥${amount.toLocaleString('ja-JP')}`
}

/** yyyy-mm-dd文字列を yyyy/m/d 表記にする（システム全体の日付表記の基準） */
export function formatDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return `${y}/${m}/${d}`
}

export function formatTime(epochMs: number): string {
  return new Date(epochMs).toLocaleTimeString('ja-JP', {
    hour: '2-digit',
    minute: '2-digit',
  })
}

/** 日付(yyyy/m/d)＋時刻を1行で表す（履歴一覧など、年まで含めて明示したい箇所用） */
export function formatDateTime(epochMs: number): string {
  return `${formatDate(dateStringFromMs(epochMs))} ${formatTime(epochMs)}`
}

/**
 * 指定時刻(epoch ms)をローカルタイムゾーンの yyyy-mm-dd 文字列にする。
 * `toISOString()`はUTC基準のため、日本時間の深夜〜早朝(UTCではまだ前日)に
 * 使うと日付が1日ずれる。データの「date」フィールドは必ずこちらを使うこと
 */
export function dateStringFromMs(epochMs: number): string {
  const d = new Date(epochMs)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function todayString(): string {
  return dateStringFromMs(Date.now())
}

/** ファイル名に付与する現在時刻の文字列（yyyymmddhhmmss、ローカルタイムゾーン） */
export function downloadTimestamp(): string {
  const d = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}${pad(d.getHours())}${pad(d.getMinutes())}${pad(d.getSeconds())}`
}

/** yyyy-mm-dd文字列に日数を加算する（ローカルタイムゾーンで計算） */
export function shiftDateString(dateStr: string, days: number): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  return dateStringFromMs(new Date(y, m - 1, d + days).getTime())
}
