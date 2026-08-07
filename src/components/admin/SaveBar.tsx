// 設定セクション共通の「まとめて保存」バー（画面下部に全幅で固定表示）
// 未変更時は非表示にし、変更が発生したときだけ現れる（保存完了後は再び非表示になる）
interface SaveBarProps {
  dirty: boolean
  saving: boolean
  onSave: () => void
  onCancel: () => void
}

export function SaveBar({ dirty, saving, onSave, onCancel }: SaveBarProps) {
  if (!dirty && !saving) return null

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t border-neutral-200 bg-white shadow-lg">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3">
        <span className="text-sm text-amber-600">未保存の変更があります</span>
        <div className="flex items-center gap-2">
          <button
            onClick={onCancel}
            disabled={saving}
            className="rounded-lg px-4 py-2 text-sm text-neutral-500 transition hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-60"
          >
            キャンセル
          </button>
          <button
            onClick={onSave}
            disabled={saving}
            className="rounded-lg bg-neutral-900 px-6 py-2 text-sm font-semibold text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {saving ? '保存中...' : '変更を保存'}
          </button>
        </div>
      </div>
    </div>
  )
}
