// 整理券シリアル番号の生成
const SERIAL_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // 紛らわしい文字(I,O,0,1)は除外

export function generateSerial(length = 4): string {
  let result = ''
  for (let i = 0; i < length; i++) {
    result += SERIAL_CHARS[Math.floor(Math.random() * SERIAL_CHARS.length)]
  }
  return result
}
