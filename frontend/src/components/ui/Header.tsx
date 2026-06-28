import React, { useState, useEffect, useRef } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, Menu, LogOut, Settings, User as UserIcon, Moon, Sun, Coins, PanelLeftClose, PanelLeftOpen, Search } from "lucide-react"
import { useAuth } from "../../hooks/useAuth"
import { useTheme } from "../../contexts/ThemeContext"
import { useNavigate, useLocation, Link } from "react-router-dom"
import { cn } from "../../lib/utils"
import { spring } from "../../lib/motion"
import { useCredits } from "../../hooks/useCredits"
import { useCountUp } from "../../hooks/useCountUp"
import { getPageTitle } from "../../lib/pageTitles"
import { useHeaderTitleOverride } from "../../contexts/HeaderTitleContext"
import Lanyard from "./Lanyard"

interface HeaderProps {
    onMenuClick?: () => void
    collapsed?: boolean
    onToggleCollapse?: () => void
}

const Header: React.FC<HeaderProps> = ({ onMenuClick, collapsed = false, onToggleCollapse }) => {
    const { user, logout } = useAuth()
    const { colorScheme, toggleColorScheme } = useTheme()
    const navigate = useNavigate()
    const location = useLocation()
    const [showProfileDropdown, setShowProfileDropdown] = useState(false)
    const isDark = colorScheme === "dark"

    const { balance: creditsBalance, loading: creditsLoading } = useCredits()
    const displayCredits = useCountUp(creditsBalance ?? 0)
    const [creditsPulse, setCreditsPulse] = useState(false)
    const prevCreditsRef = useRef(creditsBalance)

    const override = useHeaderTitleOverride()
    const pageTitle = override || getPageTitle(location.pathname)

    useEffect(() => {
        if (prevCreditsRef.current != null && creditsBalance != null && creditsBalance !== prevCreditsRef.current) {
            setCreditsPulse(true)
            const t = setTimeout(() => setCreditsPulse(false), 700)
            prevCreditsRef.current = creditsBalance
            return () => clearTimeout(t)
        }
        prevCreditsRef.current = creditsBalance
    }, [creditsBalance])

    useEffect(() => { setShowProfileDropdown(false) }, [location.pathname])

    const Logo = ({ withText }: { withText: boolean }) => (
        <Link to="/" className="flex items-center gap-2.5 min-w-0">
            <div
                className="relative flex h-9 w-9 shrink-0 items-center justify-center overflow-hidden rounded-xl text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, #10b981, #14b8a6)", boxShadow: "0 0 18px rgba(16,185,129,0.35)" }}
            >
                <span className="relative z-10 font-heading font-black">E</span>
                <div className="absolute inset-0 animate-spin-slow opacity-25"
                    style={{ background: "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.3), transparent)" }} />
            </div>
            {withText && (
                <span className={cn("hidden truncate font-heading text-lg font-bold tracking-tight sm:block", isDark ? "gradient-text" : "gradient-text-light")}>
                    EduLearn
                </span>
            )}
        </Link>
    )

    return (
        <header className="glass relative z-40 flex h-16 w-full shrink-0 items-stretch border-b border-border/60">
            {/* Brand block — width tracks the sidebar (desktop only) */}
            <motion.div
                animate={{ width: collapsed ? 72 : 260 }}
                transition={{ type: "spring", bounce: 0, duration: 0.4 }}
                className="hidden shrink-0 items-center border-r border-border/60 px-4 lg:flex"
            >
                <Logo withText={!collapsed} />
            </motion.div>

            {/* Main header row */}
            <div className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 sm:px-6">
                <div className="flex min-w-0 items-center gap-2">
                    {/* Mobile menu */}
                    <button
                        onClick={onMenuClick}
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted/50 hover:text-foreground lg:hidden"
                        aria-label="Open menu"
                    >
                        <Menu className="h-5 w-5" />
                    </button>
                    {/* Mobile logo (brand block hidden on mobile) */}
                    <div className="lg:hidden">
                        <Logo withText={false} />
                    </div>
                    {/* Desktop collapse toggle */}
                    <button
                        onClick={onToggleCollapse}
                        className="hidden h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary lg:flex"
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
                    </button>

                    {/* Page title */}
                    <AnimatePresence mode="wait">
                        <motion.h1
                            key={pageTitle}
                            initial={{ opacity: 0, y: 4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            transition={{ duration: 0.2 }}
                            className="truncate font-heading text-lg font-semibold text-foreground"
                        >
                            {pageTitle}
                        </motion.h1>
                    </AnimatePresence>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 sm:gap-3">
                    {/* Command palette trigger */}
                    <button
                        onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
                        className="hidden items-center gap-2 rounded-lg border border-border/60 bg-muted/40 px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-muted/70 hover:text-foreground sm:flex"
                        aria-label="Open command palette"
                    >
                        <Search className="h-3.5 w-3.5" />
                        <span>Search</span>
                        <kbd className="rounded border border-border bg-background/60 px-1 text-[10px] font-medium">⌘K</kbd>
                    </button>
                    <button
                        onClick={() => window.dispatchEvent(new Event("open-command-palette"))}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary sm:hidden"
                        aria-label="Search"
                    >
                        <Search className="h-4 w-4" />
                    </button>

                    <motion.button
                        whileHover={{ scale: 1.1, rotate: 15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={toggleColorScheme}
                        className="flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary"
                        aria-label="Toggle theme"
                    >
                        {isDark ? <Sun className="h-4 w-4 text-yellow-400" /> : <Moon className="h-4 w-4 text-emerald-500" />}
                    </motion.button>

                    <motion.button
                        whileHover={{ scale: 1.1, rotate: [0, -10, 8, -4, 0] }}
                        whileTap={{ scale: 0.9 }}
                        className="relative flex h-9 w-9 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted/50 hover:text-primary"
                        aria-label="Notifications"
                    >
                        <Bell className="h-4 w-4" />
                        <span className="absolute right-1.5 top-1.5 h-2 w-2 animate-pulse rounded-full border-2 border-background bg-teal-400" />
                    </motion.button>

                    {user?.role === "student" && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.85 }}
                            animate={{ opacity: 1, scale: creditsPulse ? [1, 1.12, 1] : 1 }}
                            transition={creditsPulse ? { duration: 0.5, ease: [0.16, 1, 0.3, 1] } : undefined}
                            className="hidden cursor-default select-none items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-bold transition-colors sm:flex"
                            style={{
                                background: isDark ? "rgba(251,191,36,0.12)" : "rgba(251,191,36,0.15)",
                                borderColor: isDark ? "rgba(251,191,36,0.3)" : "rgba(217,119,6,0.3)",
                                color: isDark ? "#fbbf24" : "#b45309",
                                boxShadow: creditsPulse ? "0 0 18px rgba(251,191,36,0.45)" : "none",
                            }}
                            title="Your credits balance"
                        >
                            <Coins className="h-3.5 w-3.5" />
                            <span className={cn("tabular", creditsLoading && "opacity-50")}>
                                {creditsLoading ? "…" : displayCredits.toLocaleString()}
                            </span>
                        </motion.div>
                    )}

                    {/* Profile */}
                    <div className="relative">
                        {location.pathname === '/profile' && user && (
                            <Lanyard user={user} isAdmin={user.role === 'admin' || user.is_admin} />
                        )}
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                            className="flex items-center gap-3 rounded-full border border-transparent py-1 pl-1 pr-3 transition-all hover:border-border/30 hover:bg-muted/40"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold uppercase text-white"
                                style={{ background: "linear-gradient(135deg, #10b981, #2dd4bf)" }}>
                                {(user?.name || user?.username || user?.email || "U")[0]}
                            </div>
                            <div className="hidden flex-col items-start pr-1 md:flex">
                                <span className="max-w-[110px] truncate text-sm font-semibold leading-tight text-foreground">
                                    {user?.name || user?.username || user?.email?.split("@")[0] || "User"}
                                </span>
                                <span className="text-[10px] font-bold uppercase tracking-wider" style={{ color: isDark ? "#10b981" : "#059669" }}>
                                    {user?.role || "Student"}
                                </span>
                            </div>
                        </motion.button>

                        <AnimatePresence>
                            {showProfileDropdown && (
                                <>
                                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                                        className="fixed inset-0 z-40" onClick={() => setShowProfileDropdown(false)} />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                        transition={spring.smooth}
                                        className="glass absolute right-0 top-full z-50 mt-2 w-56 origin-top-right overflow-hidden rounded-2xl border border-border/60 p-2 shadow-e4 dark:shadow-e4-dark"
                                    >
                                        <div className="mb-2 border-b border-border/30 px-3 py-3 md:hidden">
                                            <p className="text-sm font-semibold text-foreground">{user?.email}</p>
                                            <p className="text-xs capitalize text-muted-foreground">{user?.role}</p>
                                        </div>
                                        <div className="space-y-0.5">
                                            {[
                                                { icon: UserIcon, label: "My Profile", path: "/profile" },
                                                { icon: Settings, label: "Settings", path: "/settings" },
                                            ].map(({ icon: Icon, label, path }) => (
                                                <button key={path}
                                                    onClick={() => { navigate(path); setShowProfileDropdown(false) }}
                                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground transition-colors hover:bg-muted/50 hover:text-primary">
                                                    <Icon className="h-4 w-4" />
                                                    {label}
                                                </button>
                                            ))}
                                        </div>
                                        <div className="mt-2 border-t border-border/30 pt-2">
                                            <button onClick={() => { logout(); setShowProfileDropdown(false) }}
                                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10">
                                                <LogOut className="h-4 w-4" />
                                                Sign Out
                                            </button>
                                        </div>
                                    </motion.div>
                                </>
                            )}
                        </AnimatePresence>
                    </div>
                </div>
            </div>
        </header>
    )
}

export default Header
