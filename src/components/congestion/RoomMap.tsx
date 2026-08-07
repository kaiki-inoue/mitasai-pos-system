// 教室混雑マップ：定員分の円で在室状況を表現する
// 退場の手動記録は行わず、設定した想定滞在時間の経過で自動的に「退室」とみなす
import { useEffect, useState } from 'react'
import type { OccupancyEntry, YearSettings } from '@/types'

interface Unit {
  colorClass: string
}

function colorForElapsed(elapsedMinutes: number, settings: YearSettings): string {
  if (elapsedMinutes <= settings.colorThresholdMinutes.recent) return 'bg-neutral-900'
  if (elapsedMinutes <= settings.colorThresholdMinutes.mid) return 'bg-neutral-500'
  return 'bg-neutral-300'
}

export function RoomMap({
  occupancyEntries,
  settings,
}: {
  occupancyEntries: OccupancyEntry[]
  settings: YearSettings
}) {
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000)
    return () => clearInterval(timer)
  }, [])

  const staySpanMs = settings.occupancyStayMinutes * 60_000
  const activeEntries = occupancyEntries.filter((e) => now - e.entryTime < staySpanMs)

  const units: Unit[] = []
  activeEntries.forEach((entry) => {
    const elapsedMinutes = (now - entry.entryTime) / 60_000
    const colorClass = colorForElapsed(elapsedMinutes, settings)
    for (let i = 0; i < entry.partySize; i++) {
      units.push({ colorClass })
    }
  })

  const occupied = Math.min(units.length, settings.roomCapacity)
  const empty = Math.max(settings.roomCapacity - occupied, 0)
  const overflow = Math.max(units.length - settings.roomCapacity, 0)

  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-neutral-700">教室混雑マップ</h3>
        <p className="text-sm text-neutral-500">
          在室 約{units.length}人 / 定員{settings.roomCapacity}人
          {overflow > 0 && <span className="ml-1 text-amber-600">(+{overflow})</span>}
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {units.slice(0, occupied).map((u, i) => (
          <span key={i} className={`h-4 w-4 rounded-full ${u.colorClass}`} />
        ))}
        {Array.from({ length: empty }).map((_, i) => (
          <span key={`empty-${i}`} className="h-4 w-4 rounded-full border border-neutral-200 bg-neutral-50" />
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-4 text-xs text-neutral-500">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-neutral-900" /> 直近{settings.colorThresholdMinutes.recent}分以内
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-neutral-500" /> {settings.colorThresholdMinutes.recent}〜
          {settings.colorThresholdMinutes.mid}分
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-neutral-300" /> {settings.colorThresholdMinutes.mid}分以上
        </span>
      </div>
    </div>
  )
}
