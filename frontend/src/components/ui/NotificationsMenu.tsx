"use client"

import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, CheckCheck, Inbox } from "lucide-react"
import { useNotifications } from "../../hooks/useNotifications"
import { spring } from "../../lib/motion"
import { cn } from "../../lib/utils"

const TYPE_DOT: Record<string, string> = {
  success: "bg-success",
  warning: "bg-warning",
  error: "bg-destructive",
  info: "bg-info",
}

const timeAgo = (iso: string) => {
  const s = (Date.now() - new Date(iso).getTime()) / 1000
  if (Number.isNaN(s)) return ""
  if (s < 60) return "just now"
  if (s < 3600) return `${Math.floor(s / 60)}m ago`
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`
  return `${Math.floor(s / 86400)}d ago`
}

/** Header bell with a real notifications dropdown (unread badge, mark-read, mark-all). */
const NotificationsMenu: React.FC = () => {
  const { notifications, unreadCount, markAsRead, markAllAsRead, refreshNotifications } = useNotifications()
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (open) refreshNotifications()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  return (
    <div className="relative">
      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary"
        aria-label="Notifications"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full border-2 border-background bg-destructive px-1 text-[10px] font-bold leading-none text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </motion.button>

      <AnimatePresence>
        {open && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 8 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 8 }}
              transition={spring.smooth}
              className="glass absolute right-0 top-full z-50 mt-2 w-80 origin-top-right overflow-hidden rounded-2xl border border-border/60 shadow-e4 dark:shadow-e4-dark"
            >
              <div className="flex items-center justify-between border-b border-border/40 px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="font-heading text-sm font-bold text-foreground">Notifications</span>
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-primary/15 px-1.5 text-[10px] font-bold text-primary">{unreadCount}</span>
                  )}
                </div>
                {unreadCount > 0 && (
                  <button
                    onClick={() => markAllAsRead()}
                    className="flex items-center gap-1 text-xs font-medium text-primary transition-opacity hover:opacity-80"
                  >
                    <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-80 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                    <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
                      <Inbox className="h-6 w-6" />
                    </span>
                    <p className="text-sm text-muted-foreground">You're all caught up</p>
                  </div>
                ) : (
                  notifications.slice(0, 12).map((n) => (
                    <button
                      key={n.id}
                      onClick={() => !n.isRead && markAsRead(n.id)}
                      className={cn(
                        "flex w-full items-start gap-3 border-b border-border/30 px-4 py-3 text-left transition-colors last:border-0 hover:bg-muted/40",
                        !n.isRead && "bg-primary/[0.04]",
                      )}
                    >
                      <span className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", TYPE_DOT[n.type] || "bg-info", n.isRead && "opacity-30")} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-foreground">{n.title}</span>
                        <span className="line-clamp-2 block text-xs text-muted-foreground">{n.message}</span>
                        <span className="mt-0.5 block text-[10px] text-muted-foreground/70">{timeAgo(n.createdAt)}</span>
                      </span>
                      {!n.isRead && <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />}
                    </button>
                  ))
                )}
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

export default NotificationsMenu
