export function ConfirmDialog({ message, onConfirm, onCancel }: { message: string; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="bg-surface-2 border border-border rounded-lg p-5 w-80 shadow-2xl">
        <p className="text-sm text-text mb-4">{message}</p>
        <div className="flex gap-2 justify-end">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs rounded border border-border text-text-muted hover:bg-surface-3 transition-colors">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-1.5 text-xs rounded bg-danger/20 border border-danger/40 text-danger hover:bg-danger/30 transition-colors">Delete</button>
        </div>
      </div>
    </div>
  );
}
