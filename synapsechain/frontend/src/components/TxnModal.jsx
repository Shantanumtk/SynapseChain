import { useState } from "react";

export default function TxnModal({ title, description, onConfirm, onClose, loading }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="card max-w-md w-full space-y-4">
        <h3 className="font-semibold text-lg">{title}</h3>
        <p className="text-subtle text-sm">{description}</p>
        <p className="text-xs text-muted bg-bg rounded-lg p-3 border border-border">
          MetaMask will open to confirm this transaction on the local Ganache network.
        </p>
        <div className="flex gap-2 justify-end">
          <button onClick={onClose} className="btn-secondary" disabled={loading}>Cancel</button>
          <button onClick={onConfirm} className="btn-primary" disabled={loading}>
            {loading ? "Waiting for MetaMask…" : "Confirm"}
          </button>
        </div>
      </div>
    </div>
  );
}
