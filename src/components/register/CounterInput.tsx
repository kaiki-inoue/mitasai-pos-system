// ＋／－ボタンでカウントアップする最小タップ数の数量入力
import { MinusOutlined, PlusOutlined } from '@ant-design/icons'

interface Props {
  label: string
  sublabel?: string
  value: number
  onChange: (value: number) => void
  min?: number
}

export function CounterInput({ label, sublabel, value, onChange, min = 0 }: Props) {
  return (
    <div className="flex items-center justify-between rounded-xl border border-neutral-200 bg-white px-4 py-3">
      <div>
        <p className="font-medium text-neutral-900">{label}</p>
        {sublabel && <p className="text-xs text-neutral-400">{sublabel}</p>}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-neutral-300 text-neutral-600 transition hover:bg-neutral-100 active:scale-95"
          aria-label={`${label}を減らす`}
        >
          <MinusOutlined />
        </button>
        <span className="w-6 text-center text-lg font-semibold tabular-nums text-neutral-900">
          {value}
        </span>
        <button
          type="button"
          onClick={() => onChange(value + 1)}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-neutral-900 text-white transition hover:bg-neutral-700 active:scale-95"
          aria-label={`${label}を増やす`}
        >
          <PlusOutlined />
        </button>
      </div>
    </div>
  )
}
