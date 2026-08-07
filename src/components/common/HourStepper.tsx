// 時刻（0〜24時）を上下矢印で1時間ずつ増減するステッパー
// グラフX軸と同じ「9:00」表記で表示する
import { DownOutlined, UpOutlined } from '@ant-design/icons'

interface Props {
  value: number
  onChange: (value: number) => void
  min?: number
  max?: number
  /** aria-label用の名称（例: 表示開始時刻） */
  label?: string
  /** 全体の高さバリアント。省略時は既定の32px */
  size?: 32 | 38
}

const SIZE_CLASSES: Record<32 | 38, { outer: string; button: string }> = {
  32: { outer: 'h-8', button: 'h-4' },
  38: { outer: 'h-9.5', button: 'h-4.75' },
}

export function HourStepper({ value, onChange, min = 0, max = 24, label = '時刻', size = 32 }: Props) {
  const sizeClasses = SIZE_CLASSES[size]
  return (
    <div
      className={`inline-flex ${sizeClasses.outer} items-stretch overflow-hidden rounded-lg border border-neutral-300 bg-white`}
    >
      <span className="flex w-14 items-center justify-center text-sm font-medium tabular-nums text-neutral-900">
        {value}:00
      </span>
      <div className="flex flex-col border-l border-neutral-300">
        <button
          type="button"
          onClick={() => onChange(Math.min(max, value + 1))}
          disabled={value >= max}
          aria-label={`${label}を1時間進める`}
          className={`flex ${sizeClasses.button} w-7 items-center justify-center text-[10px] leading-none text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-30`}
        >
          <UpOutlined />
        </button>
        <button
          type="button"
          onClick={() => onChange(Math.max(min, value - 1))}
          disabled={value <= min}
          aria-label={`${label}を1時間戻す`}
          className={`flex ${sizeClasses.button} w-7 items-center justify-center border-t border-neutral-300 text-[10px] leading-none text-neutral-500 transition hover:bg-neutral-100 hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-30`}
        >
          <DownOutlined />
        </button>
      </div>
    </div>
  )
}
