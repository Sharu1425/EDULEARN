"use client"

import React, { useState, useCallback } from "react"
import { Link, useLocation } from "react-router-dom"
import { motion, AnimatePresence } from "framer-motion"
import {
    LayoutDashboard, ClipboardList, Code2, BarChart3, User, Settings,
    Users, CalendarDays, Trophy, ShieldCheck, ChevronLeft,
    ChevronRight, Menu, X
} from "lucide-react"
import { cn } from "../../lib/utils"
import { getSidebarNavItems } from "../../utils/roleUtils"
import type { User as UserType } from "../../types"

// Map icon string names to Lucide icon components
const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
    LayoutDashboard,
    ClipboardList,
    Code2,
    BarChart3,
    User,
    Settings,
    Users,
    CalendarDays,
    Trophy,
    ShieldCheck,
}

interface SidebarProps {
    user: UserType | null
    className?: string
}

const Sidebar: React.FC<SidebarProps> = ({ user, className }) => {
    const location = useLocation()
    const [collapsed, setCollapsed] = useState(false)
    const [mobileOpen, setMobileOpen] = useState(false)
    const navItems = getSidebarNavItems(user as any)

    const isActive = useCallback(
        (path: string, exact?: boolean) => {
            if (exact) return location.pathname === path
            return location.pathname === path || location.pathname.startsWith(path + "/")
        },
        [location.pathname]
    )

    // ── Shared nav item renderer ──────────────────────────────────────
    const NavItem = ({
        path, label, icon, exact, onClick
    }: { path: string; label: string; icon: string; exact?: boolean; onClick?: () => void }) => {
        const active = isActive(path, exact)
        const Icon = ICON_MAP[icon]

        return (
            <Link
                to={path}
                onClick={onClick}
                className={cn(
                    "group relative flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium",
                    "transition-all duration-200",
                    active
                        ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-primary"
                        : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                )}
            >
                {active && (
                    <motion.div
                        layoutId="sidebar-active-pill"
                        className="absolute inset-0 rounded-xl bg-primary/10 dark:bg-primary/15"
                        transition={{ type: "spring", bounce: 0.15, duration: 0.4 }}
                    />
                )}
                {Icon && (
                    <Icon
                        className={cn(
                            "relative z-10 h-[18px] w-[18px] shrink-0 transition-colors",
                            active ? "text-primary" : "text-muted-foreground group-hover:text-foreground"
                        )}
                    />
                )}
                {!collapsed && (
                    <span className="relative z-10 truncate leading-tight">{label}</span>
                )}
                {collapsed && (
                    <div
                        className={cn(
                            "pointer-events-none absolute left-full ml-3 z-50 rounded-lg px-2.5 py-1.5 text-xs font-semibold",
                            "bg-popover text-popover-foreground border border-border shadow-xl",
                            "opacity-0 translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-150"
                        )}
                    >
                        {label}
                    </div>
                )}
            </Link>
        )
    }

    // ── Desktop sidebar ───────────────────────────────────────────────
    const DesktopSidebar = (
        <motion.aside
            animate={{ width: collapsed ? 64 : 240 }}
            transition={{ type: "spring", bounce: 0.1, duration: 0.35 }}
            className={cn(
                "hidden lg:flex flex-col shrink-0 h-screen sticky top-0",
                "border-r border-border/60 bg-background/95 backdrop-blur-xl",
                "overflow-hidden z-30",
                className
            )}
        >
            {/* Top Collapse Toggle (replaces full logo header) */}
            <div className={cn(
                "flex items-center p-4 min-h-[64px]",
                collapsed ? "justify-center" : "justify-end"
            )}>
                <button
                    onClick={() => setCollapsed(c => !c)}
                    className={cn(
                        "rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors shrink-0"
                    )}
                    title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                >
                    {collapsed
                        ? <ChevronRight className="w-4 h-4" />
                        : <ChevronLeft className="w-4 h-4" />
                    }
                </button>
            </div>

            {/* Nav items */}
            <nav className="flex-1 overflow-y-auto overflow-x-hidden p-2 space-y-0.5 mt-2">
                {navItems.map(item => (
                    <NavItem key={item.path} {...item} />
                ))}
            </nav>

            <div className="mt-auto p-4" /> {/* Spacer for visual balance if needed */}
        </motion.aside>
    )

    // ── Mobile header button + drawer ────────────────────────────────
    const MobileNavButton = (
        <button
            onClick={() => setMobileOpen(true)}
            className="lg:hidden fixed top-4 left-4 z-50 w-9 h-9 rounded-xl glass flex items-center justify-center text-foreground shadow-lg"
        >
            <Menu className="w-4 h-4" />
        </button>
    )

    const MobileDrawer = (
        <AnimatePresence>
            {mobileOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        key="backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
                        onClick={() => setMobileOpen(false)}
                    />
                    {/* Drawer */}
                    <motion.aside
                        key="drawer"
                        initial={{ x: -280 }}
                        animate={{ x: 0 }}
                        exit={{ x: -280 }}
                        transition={{ type: "spring", bounce: 0.1, duration: 0.35 }}
                        className="fixed top-0 left-0 h-full w-64 z-50 flex flex-col lg:hidden border-r border-border/60 bg-background/98 backdrop-blur-2xl shadow-2xl"
                    >
                        {/* Mobile Drawer Top Spacer & Close */}
                        <div className="flex items-center justify-end px-4 min-h-[64px]">
                            <button
                                onClick={() => setMobileOpen(false)}
                                className="rounded-lg p-1.5 text-muted-foreground hover:text-foreground hover:bg-muted/60 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Nav items */}
                        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5 mt-2">
                            {navItems.map(item => (
                                <NavItem key={item.path} {...item} onClick={() => setMobileOpen(false)} />
                            ))}
                        </nav>

                        <div className="mt-auto p-4" /> {/* Spacer */}
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    )

    return (
        <>
            {DesktopSidebar}
            {MobileNavButton}
            {MobileDrawer}
        </>
    )
}

export default Sidebar
