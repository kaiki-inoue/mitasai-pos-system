const knownMessages = new Map<string, string>([
  [
    "担当者が無効になりました。稼働中の担当者を選び直してください",
    "選択中の担当者は現在利用できません。担当者選択から別の担当者を選んで、もう一度お試しください。",
  ],
  [
    "この整理券はすでに精算済みか、利用できません",
    "この整理券は精算済みか、現在利用できません。整理券一覧を確認して、未精算の整理券を選び直してください。",
  ],
]);

function getErrorCode(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof error.code === "string"
  ) {
    return error.code.toLowerCase();
  }
  return "";
}

export function getUserFacingErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const message = error instanceof Error ? error.message.trim() : "";
  const knownMessage = knownMessages.get(message);
  if (knownMessage) return knownMessage;

  const code = getErrorCode(error);
  if (
    /connection failed|failed to fetch|network|offline|unavailable|deadline-exceeded/i.test(
      `${code} ${message}`,
    )
  ) {
    return "通信に失敗しました。Wi-Fiまたはモバイル通信の接続を確認して、もう一度お試しください。";
  }

  if (
    code.endsWith("permission-denied") ||
    /permission.*denied|insufficient permissions/i.test(message)
  ) {
    return "保存する権限を確認できませんでした。画面を再読み込みして再度お試しください。解決しない場合は管理者にお問い合わせください。";
  }

  if (
    code.endsWith("unauthenticated") ||
    /unauthenticated|not authenticated/i.test(message)
  ) {
    return "ログイン状態を確認できませんでした。再度ログインしてからお試しください。";
  }

  return fallback;
}
