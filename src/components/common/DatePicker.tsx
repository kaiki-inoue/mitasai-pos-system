// カレンダーポップオーバー式の日付選択（"yyyy-mm-dd"文字列で受け渡し）
import { useEffect, useRef, useState } from 'react'
import { CalendarOutlined, LeftOutlined, RightOutlined } from '@ant-design/icons'
import { dateStringFromMs, formatDate, todayString } from '@/utils/format'

const WEEKDAY_LABELS = ['日', '月', '火', '水', '木', '金', '土']

/** トリガーボタンの高さ・フォントサイズのバリアント。省略時は既定(42px相当)のまま */
const SIZE_CLASSES: Record<32 | 38, string> = {
  32: 'h-8 min-w-[110px] px-2.5 text-sm',
  38: 'h-[38px] min-w-[130px] px-3 text-sm',
}

export function DatePicker({
  value,
  onChange,
  minDate,
  maxDate,
  size,
}: {
  value: string
  onChange: (value: string) => void
  /** 選択可能な日付の下限・上限（yyyy-mm-dd）。指定しない場合は制限なし */
  minDate?: string
  maxDate?: string
  /** トリガーボタンのサイズ。省略時は既定の大きさ（42px相当・w-full） */
  size?: 32 | 38
}) {
  const [open, setOpen] = useState(false)
  // 表示中の月（1日固定のDateで保持）
  const [viewMonth, setViewMonth] = useState(() => initialViewMonth(value))
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const handleMouseDown = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [open])

  const toggleOpen = () => {
    if (!open) setViewMonth(initialViewMonth(value))
    setOpen((prev) => !prev)
  }

  const handleSelect = (day: number) => {
    onChange(dateStringFromMs(new Date(viewMonth.getFullYear(), viewMonth.getMonth(), day).getTime()))
    setOpen(false)
  }

  const moveMonth = (diff: number) => {
    setViewMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + diff, 1))
  }

  const year = viewMonth.getFullYear()
  const month = viewMonth.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay() // 日曜始まり
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = todayString()

  // 月移動の上下限（min/maxを含む月より外へは移動できないようにする）
  const canGoPrevMonth = !minDate || `${year}-${String(month + 1).padStart(2, '0')}` > minDate.slice(0, 7)
  const canGoNextMonth = !maxDate || `${year}-${String(month + 1).padStart(2, '0')}` < maxDate.slice(0, 7)

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex items-center justify-between gap-2 rounded-lg border border-neutral-300 text-left focus:border-neutral-900 focus:outline-none ${
          size ? SIZE_CLASSES[size] : 'w-full px-3 py-2'
        }`}
      >
        <span className={value ? 'text-neutral-900' : 'text-neutral-400'}>
          {value ? formatDate(value) : '日付を選択'}
        </span>
        <CalendarOutlined className="text-neutral-400" />
      </button>

      {open && (
        <div className="absolute left-0 top-full z-50 mt-1 w-64 rounded-lg border border-neutral-200 bg-white p-3 shadow-lg">
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={() => moveMonth(-1)}
              disabled={!canGoPrevMonth}
              aria-label="前の月"
              className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-30"
            >
              <LeftOutlined className="text-xs" />
            </button>
            <span className="text-sm font-medium text-neutral-900">
              {year}年{month + 1}月
            </span>
            <button
              type="button"
              onClick={() => moveMonth(1)}
              disabled={!canGoNextMonth}
              aria-label="次の月"
              className="flex h-7 w-7 items-center justify-center rounded-md text-neutral-500 hover:bg-neutral-100 disabled:pointer-events-none disabled:opacity-30"
            >
              <RightOutlined className="text-xs" />
            </button>
          </div>

          <div className="grid grid-cols-7 text-center">
            {WEEKDAY_LABELS.map((label, i) => (
              <span
                key={label}
                className={`py-1 text-xs ${i === 0 ? 'text-red-500' : i === 6 ? 'text-blue-500' : 'text-neutral-400'}`}
              >
                {label}
              </span>
            ))}
            {Array.from({ length: firstWeekday }, (_, i) => (
              <span key={`blank-${i}`} />
            ))}
            {Array.from({ length: daysInMonth }, (_, i) => {
              const day = i + 1
              const dateStr = dateStringFromMs(new Date(year, month, day).getTime())
              const isSelected = dateStr === value
              const isToday = dateStr === today
              const weekday = (firstWeekday + i) % 7
              const isDisabled = (minDate && dateStr < minDate) || (maxDate && dateStr > maxDate)
              const weekendClass = weekday === 0 ? 'text-red-500' : weekday === 6 ? 'text-blue-500' : 'text-neutral-700'
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => handleSelect(day)}
                  disabled={Boolean(isDisabled)}
                  className={`mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition disabled:pointer-events-none disabled:opacity-30 ${
                    isSelected
                      ? 'bg-neutral-900 text-white'
                      : `${weekendClass} hover:bg-neutral-100 ${isToday ? 'border border-neutral-300' : ''}`
                  }`}
                >
                  {day}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/** ポップオーバーを開いたとき最初に表示する月（選択値の月、なければ今月） */
function initialViewMonth(value: string): Date {
  if (value) {
    const [y, m] = value.split('-').map(Number)
    return new Date(y, m - 1, 1)
  }
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), 1)
}
