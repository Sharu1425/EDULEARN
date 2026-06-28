import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { useNavigate } from "react-router-dom"
import {
  Search, CornerDownLeft, Sparkles,
  LayoutDashboard, ClipboardList, Code2, BarChart3, User, Settings, Users, Trophy, ShieldCheck, Map,
} from "lucide-react"
import { useAuth } from "../../hooks/useAuth"
import { getSidebarNavItems } from "../../utils/roleUtils"
import { cn } from "../../lib/utils"

const ICONS: Record<string, React.FC<{ className?: string }>> = {
  LayoutDashboard, ClipboardList, Code2, BarChart3, User, Settings, Users, Trophy, ShieldCheck, Map,
}

interface Cmd { label: string; path: string; Icon: React.FC<{ className?: string }> }

/** Global ⌘K / Ctrl+K command palette. Also opens on the `open-command-palette` event. */
const CommandPalette: React.FC = () => {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const [q, setQ] = useState("")
  const [sel, setSel] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const navItems = getSidebarNavItems(user as any)
  const commands: Cmd[] = navItems.map(n => ({ label: n.label, path: n.path, Icon: ICONS[n.icon] || Sparkles }))
  const filtered = q.trim() ? commands.filter(c => c.label.toLowerCase().includes(q.toLowerCase())) : commands

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen(o => !o) }
      else if (e.key === "Escape") setOpen(false)
    }
    const onOpen = () => setOpen(true)
    window.addEventListener("keydown", onKey)
    window.addEventListener("open-command-palette", onOpen)
    return () => {
      window.removeEventListener("keydown", onKey)
      window.removeEventListener("open-command-palette", onOpen)
    }
  }, [])

  useEffect(() => {
    if (open) { setQ(""); setSel(0); const t = setTimeout(() => inputRef.current?.focus(), 40); return () => clearTimeout(t) }
  }, [open])
  useEffect(() => { setSel(0) }, [q])

  const run = (c?: Cmd) => {
    const cmd = c || filtered[sel]
    if (!cmd) return
    setOpen(false)
    navigate(cmd.path)
  }

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setSel(s => Math.min(s + 1, filtered.length - 1)) }
    else if (e.key === "ArrowUp") { e.preventDefault(); setSel(s => Math.max(s - 1, 0)) }
    else if (e.key === "Enter") { e.preventDefault(); run() }
  }

  if (!user) return null

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[9999] flex items-start justify-center p-4 pt-[12vh]"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm backdrop-saturate-150" onClick={() => setOpen(false)} aria-hidden="true" />
          <motion.div
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            role="dialog" aria-modal="true"
            className="glass relative z-10 w-full max-w-lg overflow-hidden rounded-2xl shadow-e4 dark:shadow-e4-dark"
          >
            <div className="flex items-center gap-3 border-b border-border/60 px-4 py-3">
              <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
              <input
                ref={inputRef}
                value={q}
                onChange={e => setQ(e.target.value)}
                onKeyDown={onKeyDown}
                placeholder="Search pages & actions…"
                className="flex-1 bg-transparent text-sm text-foreground outline-none placeholder:text-muted-foreground"
              />
              <kbd className="rounded border border-border px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">ESC</kbd>
            </div>
            <div className="max-h-80 overflow-y-auto p-2">
              {filtered.length === 0 ? (
                <div className="px-3 py-8 text-center text-sm text-muted-foreground">No results for “{q}”</div>
              ) : (
                filtered.map((c, i) => (
                  <button
                    key={c.path}
                    onMouseEnter={() => setSel(i)}
                    onClick={() => run(c)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm transition-colors",
                      i === sel ? "bg-primary/10 text-primary" : "text-foreground hover:bg-muted/50"
                    )}
                  >
                    <c.Icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{c.label}</span>
                    {i === sel && <CornerDownLeft className="h-3.5 w-3.5 opacity-60" />}
                  </button>
                ))
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default CommandPalette
