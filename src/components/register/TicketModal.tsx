// 整理券配布モーダル: シリアル番号は自動生成、来場予定時刻のみ入力させる
import { useEffect, useRef, useState } from 'react'
import { CheckOutlined, ClockCircleOutlined, DownOutlined } from '@ant-design/icons'

interface Props {
  serial: string
  onCancel: () => void
  onConfirm: (arrivalTime: string) => void
}

const HOUR_OPTIONS = Array.from({ length: 24 }, (_, i) => i)
const MINUTE_STEP = 5
const MINUTE_OPTIONS = Array.from({ length: 60 / MINUTE_STEP }, (_, i) => i * MINUTE_STEP)

const pad = (n: number) => String(n).padStart(2, '0')

// 現在時刻を5分刻みに切り上げた「時・分」を初期値にする(23:58など日をまたぐ場合は0時に折り返す)
function getInitialTime() {
  const now = new Date()
  let hour = now.getHours()
  let minute = Math.ceil(now.getMinutes() / MINUTE_STEP) * MINUTE_STEP
  if (minute === 60) {
    minute = 0
    hour = (hour + 1) % 24
  }
  return { hour, minute }
}

type Panel = 'hour' | 'minute'

export function TicketModal({ serial, onCancel, onConfirm }: Props) {
  const [{ hour, minute }] = useState(getInitialTime)
  const [selectedHour, setSelectedHour] = useState(hour)
  const [selectedMinute, setSelectedMinute] = useState(minute)
  const [openPanel, setOpenPanel] = useState<Panel | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!openPanel) return
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenPanel(null)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenPanel(null)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [openPanel])

  const togglePanel = (panel: Panel) => {
    setOpenPanel((prev) => (prev === panel ? null : panel))
  }

  const arrivalTime = `${pad(selectedHour)}:${pad(selectedMinute)}`

  const renderPanel = (options: number[], selected: number, onSelect: (v: number) => void) => (
    <div className="absolute left-0 top-full z-50 mt-1 max-h-52 w-full overflow-y-auto rounded-lg border border-neutral-200 bg-white p-1 shadow-lg">
      <ul role="listbox">
        {options.map((value) => {
          const isSelected = value === selected
          return (
            <li key={value}>
              <button
                type="button"
                role="option"
                aria-selected={isSelected}
                ref={(el) => {
                  if (el && isSelected) el.scrollIntoView({ block: 'nearest' })
                }}
                onClick={() => {
                  onSelect(value)
                  setOpenPanel(null)
                }}
                className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-left text-sm transition ${
                  isSelected ? 'bg-neutral-900 text-white' : 'text-neutral-700 hover:bg-neutral-100'
                }`}
              >
                {pad(value)}
                {isSelected && <CheckOutlined className="text-xs" />}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-xl">
        <p className="text-sm text-neutral-500">整理券番号</p>
        <p className="my-3 text-5xl font-bold tracking-widest text-neutral-900">{serial}</p>
        <p className="mb-4 text-xs text-neutral-400">この番号をお客様にお伝えください</p>

        <div className="mb-5 text-left text-sm">
          <span className="mb-1 block text-neutral-600">来場予定時刻</span>
          <div ref={containerRef} className="flex items-center gap-2">
            <ClockCircleOutlined className="text-neutral-400" />
            <div className="relative flex-1">
              <button
                type="button"
                autoFocus
                onClick={() => togglePanel('hour')}
                aria-haspopup="listbox"
                aria-expanded={openPanel === 'hour'}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-lg tabular-nums transition hover:bg-neutral-50 ${
                  openPanel === 'hour' ? 'border-neutral-900' : 'border-neutral-300'
                }`}
              >
                {pad(selectedHour)}
                <DownOutlined
                  className={`text-[10px] text-neutral-400 transition ${openPanel === 'hour' ? 'rotate-180' : ''}`}
                />
              </button>
              {openPanel === 'hour' && renderPanel(HOUR_OPTIONS, selectedHour, setSelectedHour)}
            </div>
            <span className="text-lg font-medium text-neutral-400">:</span>
            <div className="relative flex-1">
              <button
                type="button"
                onClick={() => togglePanel('minute')}
                aria-haspopup="listbox"
                aria-expanded={openPanel === 'minute'}
                className={`flex w-full items-center justify-between rounded-lg border px-3 py-2 text-lg tabular-nums transition hover:bg-neutral-50 ${
                  openPanel === 'minute' ? 'border-neutral-900' : 'border-neutral-300'
                }`}
              >
                {pad(selectedMinute)}
                <DownOutlined
                  className={`text-[10px] text-neutral-400 transition ${openPanel === 'minute' ? 'rotate-180' : ''}`}
                />
              </button>
              {openPanel === 'minute' && renderPanel(MINUTE_OPTIONS, selectedMinute, setSelectedMinute)}
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100"
          >
            キャンセル
          </button>
          <button
            onClick={() => onConfirm(arrivalTime)}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white hover:bg-neutral-700"
          >
            登録する
          </button>
        </div>
      </div>
    </div>
  )
}
