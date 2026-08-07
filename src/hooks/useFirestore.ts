// Firestoreのリアルタイム購読を扱う汎用Hook群
import { useEffect, useState } from 'react'
import {
  collection,
  doc,
  onSnapshot,
  query,
  type QueryConstraint,
  type DocumentData,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'

/**
 * コレクションをリアルタイム購読し、id付きの配列として返す。
 *
 * `constraints`（QueryConstraint）はFirestore SDKの不透明なオブジェクトで、
 * 中身の値（絞り込み対象の日付など）を外から読み取れない。そのため
 * `where('date', '==', date)` のように呼び出し側の変数に依存する条件を使う場合は、
 * その変数を第3引数`deps`に明示的に渡すこと。渡さないと値が変わっても
 * 再購読されず、古い条件のデータを表示し続けるバグになる
 */
export function useCollectionData<T extends DocumentData>(
  path: string | null,
  constraints: QueryConstraint[] = [],
  deps: unknown[] = [],
) {
  const [data, setData] = useState<(T & { id: string })[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!path) {
      setData([])
      setLoading(false)
      return
    }
    setLoading(true)
    const q = query(collection(db, path), ...constraints)
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setData(snapshot.docs.map((d) => ({ id: d.id, ...(d.data() as T) })))
      setLoading(false)
    })
    return unsubscribe
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path, ...deps])

  return { data, loading }
}

/** 単一ドキュメントをリアルタイム購読する */
export function useDocumentData<T extends DocumentData>(path: string | null) {
  const [data, setData] = useState<(T & { id: string }) | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!path) {
      setData(null)
      setLoading(false)
      return
    }
    setLoading(true)
    const unsubscribe = onSnapshot(doc(db, path), (snapshot) => {
      setData(snapshot.exists() ? ({ id: snapshot.id, ...(snapshot.data() as T) }) : null)
      setLoading(false)
    })
    return unsubscribe
  }, [path])

  return { data, loading }
}
