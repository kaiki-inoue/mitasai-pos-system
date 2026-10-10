interface Props {
  message: string;
  onClose: () => void;
}

export function NotificationModal({ message, onClose }: Props) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 px-4 py-6">
      <div
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="notification-modal-title"
        aria-describedby="notification-modal-message"
        onKeyDown={(event) => {
          if (event.key === "Escape") onClose();
        }}
        className="w-full max-w-sm rounded-xl bg-white p-6 shadow-xl"
      >
        <h3
          id="notification-modal-title"
          className="mb-2 text-base font-semibold text-neutral-900"
        >
          お知らせ
        </h3>
        <p
          id="notification-modal-message"
          className="mb-5 wrap-break-word text-sm text-neutral-600"
        >
          {message}
        </p>
        <div className="flex justify-end">
          <button
            type="button"
            autoFocus
            onClick={onClose}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-neutral-700"
          >
            閉じる
          </button>
        </div>
      </div>
    </div>
  );
}
