"use client";
import { AlertTriangle } from "lucide-react";
import { T } from "@/lib/theme";
import Modal from "./Modal";
import Button from "./Button";

export default function ConfirmDialog({
  open, title, body, confirmText = "Confirm",
  danger, onConfirm, onCancel,
}) {
  return (
    <Modal open={open} onClose={onCancel} maxWidth={420}>
      <div className="p-6">
        <div className="flex items-start gap-3 mb-4">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ backgroundColor: danger ? T.redBg : T.goldBg }}
          >
            <AlertTriangle size={18} strokeWidth={2.25} style={{ color: danger ? T.red : T.gold }} />
          </div>
          <div className="flex-1">
            <h3 className="text-lg font-semibold font-serif" style={{ color: T.text }}>{title}</h3>
            <p className="text-sm mt-1 leading-relaxed" style={{ color: T.textMuted }}>{body}</p>
          </div>
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="secondary" onClick={onCancel}>Cancel</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm}>{confirmText}</Button>
        </div>
      </div>
    </Modal>
  );
}
