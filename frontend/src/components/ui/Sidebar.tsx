"use client"

import React, { useState, useCallback, useEffect } from "react"
import { Link, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
    LayoutDashboard, ClipboardList, Code2, BarChart3, User, Settings,
    Users, CalendarDays, Trophy, ShieldCheck, Map,
    X
} from "lucide-react"
import { cn } from "../../lib/utils"
import { spring, staggerContainer, staggerItem } from "../../lib/motion"
import { useTheme } from "../../contexts/ThemeContext"
import { getSidebarNavItems } from "../../utils/roleUtils"
import type { User as UserType } from "../../types"

const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
    LayoutDashboard, ClipboardList, Code2, BarChart3, User, Settings,
    Users, CalendarDays, Trophy, ShieldCheck, Map,
}

interface SidebarProps {
    user: UserType | null
    collapsed: boolean
    className?: string
}

// ── Nav Item ─────────────────────────────────────────────────────────────────
// IMPORTANT: defined at module scope (NOT inside Sidebar's render) so its
// component identity is stable. Defining it inline would make React remount the
// whole sidebar on every navigation (Sidebar re-renders via useLocation),
// replaying the entrance animation — i.e. the "sidebar reloads" bug.
interface NavItemProps {
    path: string
    label: string
    icon: string
    exact?: boolean
    collapsed: boolean
    isDark: boolean
    active: boolean
    onClick?: () => void
}

const NavItem: React.FC<NavItemProps> = ({ path, label, icon, collapsed, isDark, active, onClick }) => {
    const Icon = ICON_MAP[icon]

    const activePillBg = isDark
        ? "linear-gradient(135deg, rgba(56,189,248,0.18), rgba(139,92,246,0.18))"
        : "linear-gradient(135deg, rgba(99,102,241,0.12), rgba(14,165,233,0.12))"
    const activePillBorder = isDark ? "rgba(56,189,248,0.25)" : "rgba(99,102,241,0.35)"
    const activeAccentBar = isDark
        ? "linear-gradient(to bottom, #38bdf8, #8b5cf6)"
        : "linear-gradient(to bottom, #6366f1, #0ea5e9)"
    const activeIconColor = isDark ? "text-cyan-300" : "text-indigo-600"

    return (
        <Link
            to={path}
            onClick={onClick}
            title={collapsed ? label : undefined}
            className={cn(
                "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium select-none",
                "transition-all duration-200 active:scale-[0.97]",
                active
                    ? isDark ? "text-white" : "text-indigo-700"
                    : isDark
                        ? "text-muted-foreground hover:text-white hover:bg-white/5"
                        : "text-slate-600 hover:text-slate-900 hover:bg-slate-900/5"
            )}
        >
            {/* Active background pill — glides between items via shared layoutId */}
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
                <motion.div
                    animate={{ scale: active ? 1.12 : 1 }}
                    transition={spring.snappy}
                    className={cn(
                        "relative z-10 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition-colors",
                        active ? activeIconColor : "text-muted-foreground group-hover:text-foreground"
                    )}
                >
                    <Icon className="h-4 w-4" />
                </motion.div>
            )}

            {/* Label — crossfades when the sidebar collapses */}
            <AnimatePresence initial={false}>
                {!collapsed && (
                    <motion.span
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.15 }}
                        className="relative z-10 truncate leading-tight"
                    >
                        {label}
                    </motion.span>
                )}
            </AnimatePresence>

            {/* Collapsed tooltip */}
            {collapsed && (
                <div className={cn(
                    "glass pointer-events-none absolute left-full ml-3 z-[100] rounded-lg px-2.5 py-1.5 text-xs font-semibold whitespace-nowrap text-foreground shadow-e3 dark:shadow-e3-dark",
                    "opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150"
                )}>
                    {label}
                </div>
            )}
        </Link>
    )
}

// ── Sidebar Content (shared by desktop & mobile) ─────────────────────────────
// Also module-scope for the same stability reason as NavItem.
interface SidebarContentProps {
    collapsed: boolean
    isDark: boolean
    navItems: Array<{ path: string; label: string; icon: string; exact?: boolean }>
    isActive: (path: string, exact?: boolean) => boolean
    /** Present only for the mobile drawer (renders logo + close button). */
    onClose?: () => void
}

const SidebarContent: React.FC<SidebarContentProps> = ({ collapsed, isDark, navItems, isActive, onClose }) => (
    <>
        {/* Top bar — mobile drawer only (desktop brand + collapse live in the Header) */}
        {onClose && (
            <div className={cn("flex items-center justify-between p-4 min-h-[64px] border-b", isDark ? "border-white/5" : "border-slate-200/70")}>
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
                    className={cn("rounded-lg p-1.5 transition-colors shrink-0",
                        isDark ? "text-slate-400 hover:text-white hover:bg-white/10" : "text-slate-500 hover:text-slate-900 hover:bg-slate-100")}
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        )}

        {/* Nav items — staggered in on mount (runs once, no longer on every nav) */}
        <motion.nav
            variants={staggerContainer}
            initial="hidden"
            animate="visible"
            className="flex-1 overflow-y-auto overflow-x-hidden p-3 space-y-0.5"
        >
            {navItems.map(item => (
                <motion.div key={item.path} variants={staggerItem}>
                    <NavItem
                        {...item}
                        collapsed={collapsed}
                        isDark={isDark}
                        active={isActive(item.path, item.exact)}
                        onClick={onClose}
                    />
                </motion.div>
            ))}
        </motion.nav>

        {/* Bottom spacer */}
        <div className="h-4" />
    </>
)

const Sidebar: React.FC<SidebarProps> = ({ user, collapsed, className }) => {
    const location = useLocation()
    const { colorScheme } = useTheme()
    const isDark = colorScheme === "dark"

    const [mobileOpen, setMobileOpen] = useState(false)
    const navItems = getSidebarNavItems(user as any)

    const isActive = useCallback(
        (path: string, exact?: boolean) => {
            if (exact) return location.pathname === path
            return location.pathname === path || location.pathname.startsWith(path + "/")
        },
        [location.pathname]
    )

    // Close the mobile drawer automatically when the route changes
    useEffect(() => {
        setMobileOpen(false)
    }, [location.pathname])

    // Listen for mobile menu toggle from Header
    useEffect(() => {
        const handler = () => setMobileOpen(o => !o)
        window.addEventListener("toggle-mobile-sidebar", handler)
        return () => window.removeEventListener("toggle-mobile-sidebar", handler)
    }, [])

    // ── Theme-aware surface colors ──────────────────────────────────────────────
    const sidebarBg = isDark ? "rgba(10, 14, 28, 0.62)" : "rgba(248, 250, 252, 0.78)"
    const sidebarBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(99, 102, 241, 0.12)"
    const mobileBg = isDark ? "rgba(10, 14, 28, 0.9)" : "rgba(248, 250, 252, 0.92)"

    return (
        <>
            {/* ── Desktop Sidebar ── */}
            <motion.aside
                animate={{ width: collapsed ? 72 : 260 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className={cn(
                    "hidden lg:flex flex-col shrink-0 h-full z-30 overflow-hidden border-r",
                    className
                )}
                style={{
                    background: sidebarBg,
                    borderColor: sidebarBorder,
                    backdropFilter: "blur(24px) saturate(180%)",
                    WebkitBackdropFilter: "blur(24px) saturate(180%)",
                }}
            >
                <SidebarContent
                    collapsed={collapsed}
                    isDark={isDark}
                    navItems={navItems}
                    isActive={isActive}
                />
            </motion.aside>

            {/* ── Mobile Drawer ── */}
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
                                backdropFilter: "blur(28px) saturate(180%)",
                                WebkitBackdropFilter: "blur(28px) saturate(180%)",
                            }}
                        >
                            <SidebarContent
                                collapsed={collapsed}
                                isDark={isDark}
                                navItems={navItems}
                                isActive={isActive}
                                onClose={() => setMobileOpen(false)}
                            />
                        </motion.aside>
                    </>
                )}
            </AnimatePresence>
        </>
    )
}

export default Sidebar
