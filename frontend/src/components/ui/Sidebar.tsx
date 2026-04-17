"use client"

import React, { useState, useCallback, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
    LayoutDashboard, ClipboardList, Code2, BarChart3, User, Settings,
    Users, CalendarDays, Trophy, ShieldCheck,
    X, PanelLeftClose, PanelLeftOpen
} from "lucide-react"
import { cn } from "../../lib/utils"
import { useTheme } from "../../contexts/ThemeContext"
import { getSidebarNavItems } from "../../utils/roleUtils"
import type { User as UserType } from "../../types"

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
    LayoutDashboard, ClipboardList, Code2, BarChart3, User, Settings,
    Users, CalendarDays, Trophy, ShieldCheck,
}

interface SidebarProps {
    user: UserType | null
    className?: string
}

const Sidebar: React.FC<SidebarProps> = ({ user, className }) => {
    const location = useLocation()
    const { colorScheme } = useTheme()
    const isDark = colorScheme === "dark"

    // Persist collapsed state in localStorage
    const [collapsed, setCollapsed] = useState<boolean>(() => {
        try { return localStorage.getItem("sidebar-collapsed") === "true" }
        catch { return false }
    })
    const [mobileOpen, setMobileOpen] = useState(false)
    const navItems = getSidebarNavItems(user as any)

    // Persist collapse state
    useEffect(() => {
        localStorage.setItem("sidebar-collapsed", String(collapsed))
    }, [collapsed])

    const isActive = useCallback(
        (path: string, exact?: boolean) => {
            if (exact) return location.pathname === path
            return location.pathname === path || location.pathname.startsWith(path + "/")
        },
        [location.pathname]
    )

    // Listen for mobile menu toggle from Header
    useEffect(() => {
        const handler = () => setMobileOpen(o => !o)
        window.addEventListener("toggle-mobile-sidebar", handler)
        return () => window.removeEventListener("toggle-mobile-sidebar", handler)
    }, [])

    // ── Theme-aware CSS variables ──────────────────────────────────────────────
    const sidebarBg = isDark
        ? "rgba(2, 6, 23, 0.72)"
        : "rgba(248, 250, 252, 0.92)"
    const sidebarBorder = isDark
        ? "rgba(255,255,255,0.06)"
        : "rgba(99, 102, 241, 0.12)"
    const mobileBg = isDark
        ? "rgba(2, 6, 23, 0.97)"
        : "rgba(248, 250, 252, 0.98)"

    const activePillBg = isDark
        ? "linear-gradient(135deg, rgba(56,189,248,0.18), rgba(139,92,246,0.18))"
        : "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(14,165,233,0.12))"
    const activePillBorder = isDark
        ? "rgba(56,189,248,0.25)"
        : "rgba(99,102,241,0.35)"
    const activeAccentBar = isDark
        ? "linear-gradient(to bottom, #38bdf8, #8b5cf6)"
        : "linear-gradient(to bottom, #6366f1, #0ea5e9)"
    const activeIconColor = isDark ? "text-cyan-300" : "text-indigo-600"

    // ── Nav Item ───────────────────────────────────────────────────────────────
    const NavItem = ({
        path, label, icon, exact, onClick
    }: { path: string; label: string; icon: string; exact?: boolean; onClick?: () => void }) => {
        const active = isActive(path, exact)
        const Icon = ICON_MAP[icon]

        return (
            <Link
                to={path}
                onClick={onClick}
                title={collapsed ? label : undefined}
                className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium select-none",
                    "transition-all duration-200",
                    active
                        ? isDark ? "text-white" : "text-indigo-700"
                        : isDark
                            ? "text-muted-foreground hover:text-white hover:bg-white/5"
                            : "text-slate-600 hover:text-slate-900 hover:bg-slate-900/5"
                )}
            >
                {/* Active background pill */}
                {active && (
                    <motion.div
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-xl"
                        style={{
                            background: activePillBg,
                            border: `1px solid ${activePillBorder}`,
                            boxShadow: isDark ? "0 0 16px rgba(56,189,248,0.10)" : "0 0 16px rgba(99,102,241,0.08)",
                        }}
                        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                    />
                )}

                {/* Left accent bar */}
                {active && (
                    <div
                        className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full"
                        style={{ background: activeAccentBar }}
                    />
                )}

                {/* Icon */}
                {Icon && (
                    <div className={cn(
                        "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-all",
                        active ? activeIconColor : "text-muted-foreground group-hover:text-foreground"
                    )}>
                        <Icon className="h-4 w-4" />
                    </div>
                )}

                {/* Label */}
                {!collapsed && (
                    <span className="relative z-10 truncate leading-tight">{label}</span>
                )}

                {/* Collapsed tooltip */}
                {collapsed && (
                    <div className={cn(
                        "pointer-events-none absolute left-full ml-3 z-[100] rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap",
                        "border shadow-xl",
                        isDark
                            ? "bg-slate-900 text-slate-100 border-white/10"
                            : "bg-white text-slate-800 border-slate-200",
                        "opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150"
                    )}>
                        {label}
                    </div>
                )}
            </Link>
        )
    }

    // ── Sidebar Content (shared by desktop & mobile) ───────────────────────────
    const SidebarContent = ({ onClose }: { onClose?: () => void }) => (
        <>
            {/* Top bar */}
            <div className={cn(
                "flex items-center p-4 min-h-[64px] border-b",
                isDark ? "border-white/5" : "border-slate-200/70",
                collapsed && !onClose ? "justify-center" : "justify-between"
            )}>
                {!collapsed && !onClose && (
                    <div className="flex items-center gap-2">
                        <span className={cn(
                            "text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border",
                            isDark 
                                ? "text-cyan-400/80 border-cyan-400/20 bg-cyan-400/5" 
                                : "text-indigo-500/80 border-indigo-500/20 bg-indigo-500/5"
                        )}>
                            Menu
                        </span>
                    </div>
                )}

                {onClose ? (
                    // Mobile: show logo + close button
                    <>
                        <div className="flex items-center gap-2">
                            <div className="h-7 w-7 rounded-lg flex items-center justify-center text-white text-xs font-black"
                                style={{ background: "linear-gradient(135deg,#38bdf8,#8b5cf6)" }}>
                                E
                            </div>
                            <span className={cn("font-heading font-bold text-sm", isDark ? "text-white" : "text-slate-800")}>
                                EduLearn
                            </span>
                        </div>
                        <button
                            onClick={onClose}
                            className={cn(
                                "rounded-lg p-1.5 transition-colors shrink-0",
                                isDark
                                    ? "text-slate-400 hover:text-white hover:bg-white/10"
                                    : "text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                            )}
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </>
                ) : (
                    // Desktop: collapse toggle button
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setCollapsed(c => !c);
                        }}
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        className={cn(
                            "group/toggle relative flex h-8 w-8 items-center justify-center rounded-lg transition-all duration-300",
                            isDark
                                ? "text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/10"
                                : "text-slate-500 hover:text-indigo-600 hover:bg-indigo-600/10",
                            collapsed && "mx-auto"
                        )}
                    >
                        {collapsed
                            ? <PanelLeftOpen className="w-5 h-5 transition-transform group-hover/toggle:scale-110" />
                            : <PanelLeftClose className="w-5 h-5 transition-transform group-hover/toggle:scale-110" />
                        }
                        
                        {/* Glow effect on hover */}
                        <div className={cn(
                            "absolute inset-0 rounded-lg opacity-0 group-hover/toggle:opacity-100 blur-md transition-opacity duration-300 -z-10",
                            isDark ? "bg-cyan-400/20" : "bg-indigo-600/15"
                        )} />
                    </button>
                )}
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-0.5 mt-1">
                {navItems.map(item => (
                    <NavItem key={item.path} {...item} onClick={onClose} />
                ))}
            </nav>

            {/* Bottom spacer */}
            <div className="h-4" />
        </>
    )

    // ── Desktop Sidebar ────────────────────────────────────────────────────────
    const DesktopSidebar = (
        <motion.aside
            animate={{ width: collapsed ? 72 : 260 }}
            transition={{ type: "spring", bounce: 0, duration: 0.4 }}
            className={cn(
                "hidden lg:flex flex-col shrink-0 h-screen sticky top-0 z-30 overflow-hidden border-r pt-16",
                className
            )}
            style={{
                background: sidebarBg,
                borderColor: sidebarBorder,
                backdropFilter: "blur(24px)",
                WebkitBackdropFilter: "blur(24px)",
            }}
        >
            <SidebarContent />
        </motion.aside>
    )

    // ── Mobile Drawer ───────────────────────────────────────────────────────────
    const MobileDrawer = (
        <AnimatePresence>
            {mobileOpen && (
                <>
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setMobileOpen(false)}
                    />
                    <motion.aside
                        key="drawer"
                        initial={{ x: -280 }}
                        animate={{ x: 0 }}
                        exit={{ x: -280 }}
                        transition={{ type: "spring", bounce: 0.08, duration: 0.35 }}
                        className="fixed top-0 left-0 h-full w-64 z-50 flex flex-col lg:hidden border-r shadow-2xl overflow-hidden"
                        style={{
                            background: mobileBg,
                            borderColor: sidebarBorder,
                            backdropFilter: "blur(28px)",
                            WebkitBackdropFilter: "blur(28px)",
                        }}
                    >
                        <SidebarContent onClose={() => setMobileOpen(false)} />
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    )

    return (
        <>
            {DesktopSidebar}
            {MobileDrawer}
        </>
    )
}

export default Sidebar
