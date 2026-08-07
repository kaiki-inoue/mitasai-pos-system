// 数値入力欄の共通コンポーネント
// type="number" は空欄を維持できず Number('') === 0 のため強制的に「0」が残る不具合がある。
// そのため type="text" + ローカルの文字列state で保持し、数字以外は正規表現で除去する。
// 空欄の見た目を維持したまま、有効な数値になったときだけ親へ number を通知する。
import { useEffect, useRef, useState } from 'react'

export function NumberField({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: number
  onChange: (value: number) => void
  placeholder?: string
  className?: string
}) {
  const [text, setText] = useState(() => String(value))
  // 最後に自分が親へ通知した値。親のvalueがこれと異なる＝外部由来の変更のときだけ同期する。
  // （空欄→onChange(0)で親が0になっても、テキストの空欄表示を壊さないため）
  const lastEmitted = useRef(value)

  useEffect(() => {
    if (value !== lastEmitted.current) {
      setText(String(value))
      lastEmitted.current = value
    }
  }, [value])

  const handleChange = (raw: string) => {
    // 数字以外（マイナス・小数点・全角なども含む）を除去。負数・非数値は入力不可になる。
    const filtered = raw.replace(/[^0-9]/g, '')
    setText(filtered)
    const next = filtered === '' ? 0 : Number(filtered)
    lastEmitted.current = next
    onChange(next)
  }

  return (
    <input
      type="text"
      inputMode="numeric"
      pattern="[0-9]*"
      value={text}
      placeholder={placeholder}
      onChange={(e) => handleChange(e.target.value)}
      className={className}
    />
  )
}
