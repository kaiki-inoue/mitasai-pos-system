// Firebase Admin SDK 初期化（サーバーサイド専用）
// Vercel の Serverless Function からのみ使用する。クライアントには絶対に含めない。
import { initializeApp, getApps, cert, type App } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'

let adminApp: App

function getAdminApp(): App {
  if (getApps().length) {
    return getApps()[0]!
  }

  const projectId = process.env.FIREBASE_ADMIN_PROJECT_ID
  const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL
  // Vercelの環境変数では改行が \n としてエスケープされて保存されるため復元する
  const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, '\n')

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('Firebase Admin の環境変数が設定されていません')
  }

  adminApp = initializeApp({
    credential: cert({ projectId, clientEmail, privateKey }),
  })
  return adminApp
}

export function getAdminAuth() {
  return getAuth(getAdminApp())
}
