// 混雑状況タブ：棒グラフ＋教室混雑マップ
import { useState } from 'react'
import type { EnvName, YearDoc } from '@/types'
import { useOccupancyByDate, useTicketsByDate } from '@/hooks/useYearData'
import { todayString } from '@/utils/format'
import { EntryBarChart } from './EntryBarChart'
import { RoomMap } from './RoomMap'

export function CongestionTab({ env, year }: { env: EnvName; year: YearDoc }) {
  const [chartDate, setChartDate] = useState(() => {
    const today = todayString()
    return today >= year.startDate && today <= year.endDate ? today : year.startDate
  })
  const today = todayString()

  const { data: chartOccupancy } = useOccupancyByDate(env, year.id, chartDate)
  const { data: chartTickets } = useTicketsByDate(env, year.id, chartDate)
  const { data: todayOccupancy } = useOccupancyByDate(env, year.id, today)

  return (
    <div className="space-y-6">
      <EntryBarChart
        date={chartDate}
        onDateChange={setChartDate}
        minDate={year.startDate}
        maxDate={year.endDate}
        occupancyEntries={chartOccupancy}
        tickets={chartTickets}
        settings={year.settings}
      />
      <RoomMap occupancyEntries={todayOccupancy} settings={year.settings} />
    </div>
  )
}
