'use client';

import Modal from '@/app/components/Modal';

export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  busy,
  title = 'Confirm',
  message,
  confirmLabel = 'Confirm',
  danger = false,
}) {
  return (
    <Modal open={open} onClose={busy ? () => {} : onClose}>
      <div className="p-6">
        <h3 className="text-lg font-semibold">{title}</h3>
        {message && <div className="text-sm text-gray-300 mt-3 whitespace-pre-line">{message}</div>}
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={onClose} className="btn-neutral" disabled={busy}>Cancel</button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className={danger ? 'btn-danger-variant' : 'px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-sm disabled:opacity-50'}
          >
            {busy ? 'Working…' : confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
