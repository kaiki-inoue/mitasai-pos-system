// PIN(合言葉)入力画面。認証成功までダッシュボードへは進めない
import { useState, type FormEvent } from 'react'
import { LockOutlined, LoadingOutlined } from '@ant-design/icons'
import { useAuth } from '@/context/AuthContext'

export function PinGate() {
  const { login } = useAuth()
  const [code, setCode] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      await login(code)
    } catch (err) {
      setError(err instanceof Error ? err.message : '認証に失敗しました')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-neutral-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-sm rounded-2xl border border-neutral-200 bg-white p-8 shadow-sm"
      >
        <div className="mb-6 flex flex-col items-center gap-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-neutral-900 text-white">
            <LockOutlined />
          </div>
          <h1 className="text-lg font-semibold text-neutral-900">文化祭受付システム</h1>
          <p className="text-sm text-neutral-500">PINコードを入力してください</p>
        </div>

        <input
          type="text"
          inputMode="text"
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value)}
          className="w-full rounded-lg border border-neutral-300 px-4 py-3 text-center text-lg tracking-widest focus:border-neutral-900 focus:outline-none"
          placeholder="••••"
        />

        {error && <p className="mt-3 text-center text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={submitting || !code}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-lg bg-neutral-900 py-3 text-sm font-medium text-white transition hover:bg-neutral-700 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting && <LoadingOutlined />}
          入室する
        </button>
      </form>
    </div>
  )
}
