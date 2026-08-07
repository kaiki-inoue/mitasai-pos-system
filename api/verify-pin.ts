// PIN（または合言葉）を検証し、該当環境（本番/デモ）用の
// Firebaseカスタムトークンを発行するServerless Function。
// PINそのものはVercelの環境変数にのみ保持し、クライアントへは一切送らない。
import type { VercelRequest, VercelResponse } from '@vercel/node'
import { randomUUID } from 'node:crypto'
import { getAdminAuth } from './_lib/firebaseAdmin.js'
import type { EnvName } from '../src/types/index.js'

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: '許可されていないリクエストです' })
    return
  }

  const code = typeof req.body?.code === 'string' ? req.body.code.trim() : ''
  if (!code) {
    res.status(400).json({ error: 'コードを入力してください' })
    return
  }

  const codeToEnv: Record<string, EnvName> = {
    [process.env.AUTH_CODE_PRODUCTION ?? '']: 'production',
    [process.env.AUTH_CODE_DEMO ?? '']: 'demo',
  }

  const env = codeToEnv[code]
  if (!env) {
    res.status(401).json({ error: 'コードが正しくありません' })
    return
  }

  try {
    const uid = `session-${randomUUID()}`
    const token = await getAdminAuth().createCustomToken(uid, { env })
    res.status(200).json({ token, env })
  } catch (error) {
    console.error('カスタムトークン発行に失敗しました', error)
    res.status(500).json({ error: 'サーバーエラーが発生しました' })
  }
}
