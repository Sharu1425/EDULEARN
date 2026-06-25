import React from "react"
import { motion } from "framer-motion"
import { AlertTriangle } from "lucide-react"
import Button from "./Button"
import Overlay from "./Overlay"
import { spring } from "../../lib/motion"

interface ConfirmDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: "danger" | "warning" | "info"
  loading?: boolean
}

// Map each severity to a semantic token + the matching Button variant.
const VARIANT = {
  danger: { token: "destructive", button: "destructive" as const },
  warning: { token: "warning", button: "primary" as const },
  info: { token: "info", button: "primary" as const },
}

const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  loading = false,
}) => {
  const { token, button } = VARIANT[variant]
  const color = `hsl(var(--${token}))`

  return (
    <Overlay isOpen={isOpen} onClose={loading ? () => {} : onClose} closeOnBackdrop={!loading}>
      <div className="glass rounded-2xl p-6 shadow-e4 dark:shadow-e4-dark">
        <div className="flex items-start gap-4">
          <motion.div
            initial={{ scale: 0, rotate: -15 }}
            animate={{ scale: 1, rotate: 0 }}
            transition={spring.snappy}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full border"
            style={{ background: `hsl(var(--${token}) / 0.12)`, borderColor: `hsl(var(--${token}) / 0.3)` }}
          >
            <AlertTriangle className="h-6 w-6" style={{ color }} />
          </motion.div>

          <div className="flex-1">
            <h3 className="mb-1.5 text-lg font-semibold text-foreground">{title}</h3>
            <p className="mb-6 text-sm text-muted-foreground">{message}</p>
            <div className="flex justify-end gap-3">
              <Button variant="ghost" onClick={onClose} disabled={loading}>
                {cancelText}
              </Button>
              <Button variant={button} onClick={onConfirm} isLoading={loading}>
                {confirmText}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </Overlay>
  )
}

export default ConfirmDialog
