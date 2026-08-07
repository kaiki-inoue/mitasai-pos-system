// 整理券一覧（来場予定時刻順）。精算でレジへ内容を戻し、削除で来場なしとして扱う
import { CheckOutlined, DeleteOutlined } from '@ant-design/icons'
import type { Ticket } from '@/types'
import { formatDate } from '@/utils/format'

interface Props {
  tickets: Ticket[]
  onSettle: (ticket: Ticket) => void
  onDelete: (ticket: Ticket) => void
}

export function TicketList({ tickets, onSettle, onDelete }: Props) {
  return (
    <div className="rounded-xl border border-neutral-200 bg-white p-4">
      <h3 className="mb-3 text-sm font-semibold text-neutral-700">整理券一覧</h3>
      {tickets.length === 0 ? (
        <p className="text-sm text-neutral-400">整理券はありません</p>
      ) : (
        <ul className="divide-y divide-neutral-100">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="flex items-center justify-between py-2.5">
              <div className="flex items-center gap-3">
                <span className="rounded-md bg-neutral-100 px-2 py-1 font-mono text-sm font-semibold text-neutral-800">
                  {ticket.serial}
                </span>
                <span className="text-xs text-neutral-600">
                  {formatDate(ticket.date)} {ticket.arrivalTime} 来場予定
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onSettle(ticket)}
                  className="flex items-center gap-1 rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700"
                >
                  <CheckOutlined /> 精算
                </button>
                <button
                  onClick={() => onDelete(ticket)}
                  className="flex h-8 w-8 items-center justify-center rounded-lg border border-neutral-200 text-neutral-500 hover:bg-neutral-100"
                  aria-label="削除"
                >
                  <DeleteOutlined />
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
