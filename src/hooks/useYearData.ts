// 年度配下の各コレクションを購読する専用Hook群
import { limit, orderBy, where } from 'firebase/firestore'
import { useCollectionData, useDocumentData } from './useFirestore'
import {
  feeItemsPath,
  groupFeeItemsPath,
  occupancyPath,
  productsPath,
  registerSessionsPath,
  staffPath,
  ticketsPath,
  transactionsPath,
  yearPath,
  yearsPath,
} from '@/lib/paths'
import type {
  EnvName,
  FeeItem,
  GroupFeeItem,
  OccupancyEntry,
  Product,
  RegisterSession,
  StaffMember,
  Ticket,
  Transaction,
  YearDoc,
} from '@/types'

export function useYears(env: EnvName | null) {
  return useCollectionData<YearDoc>(env ? yearsPath(env) : null, [orderBy('startDate', 'desc')])
}

export function useYear(env: EnvName | null, yearId: string | null) {
  return useDocumentData<YearDoc>(env && yearId ? yearPath(env, yearId) : null)
}

export function useFeeItems(env: EnvName | null, yearId: string | null) {
  return useCollectionData<FeeItem>(env && yearId ? feeItemsPath(env, yearId) : null, [
    orderBy('order', 'asc'),
  ])
}

export function useGroupFeeItems(env: EnvName | null, yearId: string | null) {
  return useCollectionData<GroupFeeItem>(env && yearId ? groupFeeItemsPath(env, yearId) : null, [
    orderBy('order', 'asc'),
  ])
}

export function useProducts(env: EnvName | null, yearId: string | null) {
  return useCollectionData<Product>(env && yearId ? productsPath(env, yearId) : null, [
    orderBy('order', 'asc'),
  ])
}

export function useStaffList(env: EnvName | null, yearId: string | null) {
  return useCollectionData<StaffMember>(env && yearId ? staffPath(env, yearId) : null, [
    orderBy('order', 'asc'),
  ])
}

/** 直近の履歴（金額計算タブ用） */
export function useRecentTransactions(env: EnvName | null, yearId: string | null, count = 5) {
  return useCollectionData<Transaction>(
    env && yearId ? transactionsPath(env, yearId) : null,
    [orderBy('createdAt', 'desc'), limit(count)],
    [count],
  )
}

/** 指定日の取引（レジ締め集計・CSV日次出力用） */
export function useTransactionsByDate(env: EnvName | null, yearId: string | null, date: string) {
  return useCollectionData<Transaction>(
    env && yearId ? transactionsPath(env, yearId) : null,
    [where('date', '==', date), orderBy('createdAt', 'asc')],
    [date],
  )
}

export function usePendingTickets(env: EnvName | null, yearId: string | null) {
  return useCollectionData<Ticket>(env && yearId ? ticketsPath(env, yearId) : null, [
    where('status', '==', 'pending'),
    orderBy('arrivalTime', 'asc'),
  ])
}

/** 棒グラフ用：指定日に配布された全整理券（受付時刻の集計に使用） */
export function useTicketsByDate(env: EnvName | null, yearId: string | null, date: string) {
  return useCollectionData<Ticket>(
    env && yearId ? ticketsPath(env, yearId) : null,
    [where('date', '==', date), orderBy('createdAt', 'asc')],
    [date],
  )
}

/** 指定日のみを対象にした入場記録（無料枠を意識し全期間は購読しない） */
export function useOccupancyByDate(env: EnvName | null, yearId: string | null, date: string) {
  return useCollectionData<OccupancyEntry>(
    env && yearId ? occupancyPath(env, yearId) : null,
    [where('date', '==', date), orderBy('entryTime', 'asc')],
    [date],
  )
}

export function useRegisterSessions(env: EnvName | null, yearId: string | null, date: string) {
  return useCollectionData<RegisterSession>(
    env && yearId ? registerSessionsPath(env, yearId) : null,
    [where('date', '==', date), orderBy('createdAt', 'asc')],
    [date],
  )
}
