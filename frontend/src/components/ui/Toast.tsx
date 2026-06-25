import React, { useEffect } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle2, XCircle, AlertTriangle, Info, X } from 'lucide-react';
import { spring } from '../../lib/motion';

export interface ToastProps {
  id: string;
  type: 'success' | 'error' | 'info' | 'warning';
  title: string;
  message?: string;
  duration?: number;
  onClose: (id: string) => void;
}

// Each type maps to a semantic CSS token (themeable in light + dark).
const TOAST_CONFIG = {
  success: { token: 'success', Icon: CheckCircle2 },
  error: { token: 'destructive', Icon: XCircle },
  warning: { token: 'warning', Icon: AlertTriangle },
  info: { token: 'info', Icon: Info },
} as const;

const Toast: React.FC<ToastProps> = ({ id, type, title, message, duration = 4000, onClose }) => {
  const { token, Icon } = TOAST_CONFIG[type];
  const color = `hsl(var(--${token}))`;

  useEffect(() => {
    const timer = setTimeout(() => onClose(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onClose]);

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, x: 40, scale: 0.95 }}
      transition={spring.smooth}
      className="glass relative w-80 max-w-[calc(100vw-2rem)] overflow-hidden rounded-2xl shadow-e3 dark:shadow-e3-dark"
    >
      {/* Token accent edge */}
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: color }} aria-hidden="true" />

      <div className="flex items-start gap-3 p-4 pl-5">
        <motion.div
          initial={{ scale: 0, rotate: -20 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ ...spring.snappy, delay: 0.05 }}
          className="mt-0.5 shrink-0"
          style={{ color }}
        >
          <Icon className="h-5 w-5" />
        </motion.div>

        <div className="min-w-0 flex-1">
          <h4 className="text-sm font-semibold text-foreground">{title}</h4>
          {message && <p className="mt-0.5 text-sm text-muted-foreground">{message}</p>}
        </div>

        <button
          onClick={() => onClose(id)}
          className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          aria-label="Dismiss notification"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Progress — scaleX (transform-only) instead of animating width */}
      <motion.div
        className="absolute bottom-0 left-0 h-0.5 w-full origin-left"
        style={{ background: color, opacity: 0.5 }}
        initial={{ scaleX: 1 }}
        animate={{ scaleX: 0 }}
        transition={{ duration: duration / 1000, ease: 'linear' }}
        aria-hidden="true"
      />
    </motion.div>
  );
};

export default Toast;
