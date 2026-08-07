// 認証状態（PIN認証によるenv切替）とスタッフ選択を管理するコンテキスト
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import { onAuthStateChanged, signInWithCustomToken, signOut, type User } from 'firebase/auth'
import { auth } from '@/lib/firebase'
import type { EnvName, StaffMember } from '@/types'

interface AuthContextValue {
  loading: boolean
  user: User | null
  env: EnvName | null
  login: (code: string) => Promise<void>
  logout: () => Promise<void>
  staff: StaffMember | null
  setStaff: (staff: StaffMember | null) => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

const STAFF_STORAGE_KEY = 'mitasai-pos:selected-staff'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [env, setEnv] = useState<EnvName | null>(null)
  const [staff, setStaffState] = useState<StaffMember | null>(() => {
    const raw = localStorage.getItem(STAFF_STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StaffMember) : null
  })

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser)
      if (nextUser) {
        const tokenResult = await nextUser.getIdTokenResult()
        setEnv((tokenResult.claims.env as EnvName) ?? null)
      } else {
        setEnv(null)
      }
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const login = async (code: string) => {
    let response: Response
    try {
      response = await fetch('/api/verify-pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code }),
      })
    } catch {
      // ネットワーク断など fetch 自体の失敗（TypeError: Failed to fetch 等）を
      // 一般利用者向けの日本語メッセージに変換する
      throw new Error('通信に失敗しました。もう一度お試しください。')
    }

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      // サーバーが返す既知の日本語エラー（PIN不一致など）はそのまま表示する
      throw new Error(typeof data.error === 'string' ? data.error : '認証に失敗しました')
    }

    try {
      await signInWithCustomToken(auth, data.token)
    } catch {
      // Firebase Authentication SDK が投げる英語かつ技術的なメッセージ
      // （auth/invalid-custom-token 等）が画面に漏れないよう置き換える
      throw new Error('通信に失敗しました。もう一度お試しください。')
    }
  }

  const logout = async () => {
    await signOut(auth)
    setStaffState(null)
    localStorage.removeItem(STAFF_STORAGE_KEY)
  }

  const setStaff = (nextStaff: StaffMember | null) => {
    setStaffState(nextStaff)
    if (nextStaff) {
      localStorage.setItem(STAFF_STORAGE_KEY, JSON.stringify(nextStaff))
    } else {
      localStorage.removeItem(STAFF_STORAGE_KEY)
    }
  }

  const value = useMemo(
    () => ({ loading, user, env, login, logout, staff, setStaff }),
    [loading, user, env, staff],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth は AuthProvider の内部で使用してください')
  return ctx
}
