// 削除操作共通の確認モーダル
// requireTypedText を指定すると、その文字列を正確に入力するまで削除ボタンが有効化されない
import { useState } from 'react'

interface Props {
  title: string
  message: string
  onConfirm: () => void | Promise<void>
  onCancel: () => void
  requireTypedText?: string
}

export function ConfirmDeleteModal({ title, message, onConfirm, onCancel, requireTypedText }: Props) {
  const [typedText, setTypedText] = useState('')
  const [deleting, setDeleting] = useState(false)

  const canDelete = !deleting && (!requireTypedText || typedText === requireTypedText)

  const handleConfirm = async () => {
    if (!canDelete) return
    setDeleting(true)
    try {
      await onConfirm()
    } finally {
      setDeleting(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="mb-2 text-base font-semibold text-neutral-900">{title}</h3>
        <p className="mb-4 text-sm text-neutral-600">{message}</p>

        {requireTypedText && (
          <label className="mb-5 block text-sm">
            <input
              value={typedText}
              onChange={(e) => setTypedText(e.target.value)}
              autoFocus
              className="w-full rounded-lg border border-neutral-300 px-3 py-2 focus:border-red-600 focus:outline-none"
            />
            <span className="mt-1 block text-xs text-neutral-400">
              確認のため「{requireTypedText}」と入力してください
            </span>
          </label>
        )}

        <div className="flex justify-end gap-2">
          <button
            onClick={onCancel}
            disabled={deleting}
            className="rounded-lg px-4 py-2 text-sm text-neutral-500 hover:bg-neutral-100 disabled:cursor-not-allowed disabled:opacity-40"
          >
            キャンセル
          </button>
          <button
            onClick={handleConfirm}
            disabled={!canDelete}
            className="rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {deleting ? '削除中...' : '削除'}
          </button>
        </div>
      </div>
    </div>
  )
}
