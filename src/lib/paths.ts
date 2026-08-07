// Firestoreのコレクション/ドキュメントパスを一箇所にまとめる
import type { EnvName } from '@/types'

export const yearsPath = (env: EnvName) => `environments/${env}/years`
export const yearPath = (env: EnvName, yearId: string) => `${yearsPath(env)}/${yearId}`
export const feeItemsPath = (env: EnvName, yearId: string) => `${yearPath(env, yearId)}/feeItems`
export const groupFeeItemsPath = (env: EnvName, yearId: string) =>
  `${yearPath(env, yearId)}/groupFeeItems`
export const productsPath = (env: EnvName, yearId: string) => `${yearPath(env, yearId)}/products`
export const staffPath = (env: EnvName, yearId: string) => `${yearPath(env, yearId)}/staff`
export const transactionsPath = (env: EnvName, yearId: string) =>
  `${yearPath(env, yearId)}/transactions`
export const ticketsPath = (env: EnvName, yearId: string) => `${yearPath(env, yearId)}/tickets`
export const occupancyPath = (env: EnvName, yearId: string) =>
  `${yearPath(env, yearId)}/occupancyEntries`
export const registerSessionsPath = (env: EnvName, yearId: string) =>
  `${yearPath(env, yearId)}/registerSessions`
