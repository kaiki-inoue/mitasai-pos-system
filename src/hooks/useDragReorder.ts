// HTML5 Drag and Drop APIによるリスト並び替え用の共通Hook
// 外部ライブラリは使わず、ドラッグ中に別の行へ重なった時点でonMoveを呼んでローカル順序を即時入れ替える
import { useRef, useState } from 'react'
import type { DragEvent } from 'react'

export function useDragReorder(onMove: (from: number, to: number) => void) {
  const dragIndexRef = useRef<number | null>(null)
  const [draggingIndex, setDraggingIndex] = useState<number | null>(null)

  /** 掴んで動かすハンドル要素に付与するprops */
  const handleProps = (index: number) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      dragIndexRef.current = index
      setDraggingIndex(index)
      e.dataTransfer.effectAllowed = 'move'
    },
    onDragEnd: () => {
      dragIndexRef.current = null
      setDraggingIndex(null)
    },
  })

  /** ドロップ先となる行要素に付与するprops */
  const rowProps = (index: number) => ({
    onDragOver: (e: DragEvent) => {
      e.preventDefault()
      const from = dragIndexRef.current
      if (from === null || from === index) return
      onMove(from, index)
      dragIndexRef.current = index
      setDraggingIndex(index)
    },
    onDrop: (e: DragEvent) => e.preventDefault(),
  })

  return { draggingIndex, handleProps, rowProps }
}

/** 配列のfrom位置の要素をto位置へ移動した新しい配列を返す */
export function moveItem<T>(list: T[], from: number, to: number): T[] {
  const next = [...list]
  const [moved] = next.splice(from, 1)
  next.splice(to, 0, moved)
  return next
}

/**
 * ローカルの並び替えドラフト（idの配列）を購読データへ適用する。
 * ドラフトがnullなら購読順のまま。ドラフトにない新規追加分は末尾へ、削除済みidは無視する
 */
export function applyOrder<T extends { id: string }>(items: T[], order: string[] | null): T[] {
  if (!order) return items
  const map = new Map(items.map((item) => [item.id, item]))
  const ordered = order.flatMap((id) => {
    const item = map.get(id)
    return item ? [item] : []
  })
  items.forEach((item) => {
    if (!order.includes(item.id)) ordered.push(item)
  })
  return ordered
}
