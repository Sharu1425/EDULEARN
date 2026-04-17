import React, { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { Bell, Menu, LogOut, Settings, User as UserIcon, Moon, Sun } from "lucide-react"
import { useAuth } from "../../hooks/useAuth"
import { useTheme } from "../../contexts/ThemeContext"
import { useNavigate, useLocation } from "react-router-dom"
import { cn } from "../../lib/utils"

interface HeaderProps {
    onMenuClick?: () => void
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
    const { user, logout } = useAuth()
    const { colorScheme, toggleColorScheme } = useTheme()
    const navigate = useNavigate()
    const location = useLocation()
    const [showProfileDropdown, setShowProfileDropdown] = useState(false)
    const [scrolled, setScrolled] = useState(false)
    const isDark = colorScheme === "dark"

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20)
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    useEffect(() => {
        setShowProfileDropdown(false)
    }, [location.pathname])

    // ── Theme-aware values ─────────────────────────────────────────────────────
    const headerBg = scrolled
        ? isDark
            ? "rgba(2, 6, 23, 0.88)"
            : "rgba(248, 250, 252, 0.92)"
        : isDark
            ? "rgba(2, 6, 23, 0.4)"
            : "rgba(248, 250, 252, 0.6)"

    const headerBorderColor = scrolled
        ? isDark ? "rgba(255,255,255,0.07)" : "rgba(99,102,241,0.15)"
        : "transparent"

    const dropdownBg = isDark ? "rgba(10, 14, 30, 0.95)" : "rgba(255, 255, 255, 0.98)"
    const dropdownBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(99,102,241,0.15)"

    return (
        <header
            className="fixed top-0 left-0 z-[60] w-full transition-all duration-500 backdrop-blur-2xl border-b"
            style={{
                background: headerBg,
                borderColor: headerBorderColor,
                boxShadow: scrolled
                    ? isDark
                        ? "0 4px 30px rgba(0,0,0,0.4)"
                        : "0 4px 30px rgba(99,102,241,0.08)"
                    : "none",
            }}
        >
            <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Left Side */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden rounded-lg p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <motion.div
                            whileHover={{ scale: 1.05 }}
                            className="relative flex h-9 w-9 items-center justify-center rounded-xl text-white font-bold text-sm shadow-lg overflow-hidden"
                            style={{
                                background: "linear-gradient(135deg, #38bdf8, #818cf8)",
                                boxShadow: "0 0 20px rgba(56,189,248,0.35)",
                            }}
                        >
                            <span className="relative z-10 font-heading font-black">E</span>
                            <div className="absolute inset-0 animate-spin-slow opacity-25"
                                style={{ background: "conic-gradient(from 0deg, transparent, rgba(255,255,255,0.3), transparent)" }} />
                        </motion.div>
                        <span className={cn(
                            "font-heading font-bold text-lg tracking-tight hidden sm:block",
                            isDark ? "gradient-text" : "gradient-text-light"
                        )}>
                            EduLearn
                        </span>
                    </div>
                </div>

                {/* Right Side */}
                <div className="flex items-center gap-2 sm:gap-3">

                    {/* Theme Toggle */}
                    <motion.button
                        whileHover={{ scale: 1.1, rotate: 15 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={toggleColorScheme}
                        className="flex items-center justify-center h-9 w-9 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-primary transition-colors"
                        aria-label="Toggle theme"
                    >
                        {isDark
                            ? <Sun className="h-4 w-4 text-yellow-400" />
                            : <Moon className="h-4 w-4 text-indigo-500" />}
                    </motion.button>

                    {/* Notifications */}
                    <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        className="relative flex items-center justify-center h-9 w-9 rounded-full text-muted-foreground hover:bg-muted/50 hover:text-primary transition-colors"
                    >
                        <Bell className="h-4 w-4" />
                        <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-cyan-400 border-2 border-background animate-pulse" />
                    </motion.button>

                    <div className="h-5 w-[1px] bg-border/50 mx-1 hidden sm:block" />

                    {/* Profile */}
                    <div className="relative">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                            className="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 hover:bg-muted/40 border border-transparent hover:border-border/30 transition-all"
                        >
                            <div
                                className="flex h-8 w-8 items-center justify-center rounded-full font-bold uppercase text-sm text-white"
                                style={{ background: "linear-gradient(135deg, #38bdf8, #8b5cf6)" }}
                            >
                                {(user?.name || user?.username || user?.email || "U")[0]}
                            </div>
                            <div className="hidden md:flex flex-col items-start pr-1">
                                <span className="text-sm font-semibold leading-tight text-foreground truncate max-w-[110px]">
                                    {user?.name || user?.username || user?.email?.split("@")[0] || "User"}
                                </span>
                                <span className="text-[10px] uppercase font-bold tracking-wider"
                                    style={{ color: isDark ? "#38bdf8" : "#6366f1" }}>
                                    {user?.role || "Student"}
                                </span>
                            </div>
                        </motion.button>

                        {/* Dropdown */}
                        <AnimatePresence>
                            {showProfileDropdown && (
                                <>
                                    <motion.div
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                        className="fixed inset-0 z-40"
                                        onClick={() => setShowProfileDropdown(false)}
                                    />
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.95, y: 8 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 8 }}
                                        transition={{ type: "spring", stiffness: 420, damping: 30 }}
                                        className="absolute right-0 top-full mt-2 w-56 origin-top-right rounded-2xl border p-2 shadow-2xl z-50 overflow-hidden"
                                        style={{
                                            background: dropdownBg,
                                            backdropFilter: "blur(20px)",
                                            borderColor: dropdownBorder,
                                        }}
                                    >
                                        <div className="px-3 py-3 border-b border-border/30 mb-2 md:hidden">
                                            <p className="text-sm font-semibold text-foreground">{user?.email}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                                        </div>

                                        <div className="space-y-0.5">
                                            {[
                                                { icon: UserIcon, label: "My Profile", path: "/profile" },
                                                { icon: Settings, label: "Settings", path: "/settings" },
                                            ].map(({ icon: Icon, label, path }) => (
                                                <button key={path}
                                                    onClick={() => { navigate(path); setShowProfileDropdown(false) }}
                                                    className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 hover:text-primary transition-colors"
                                                >
                                                    <Icon className="h-4 w-4" />
                                                    {label}
                                                </button>
                                            ))}
                                        </div>

                                        <div className="mt-2 border-t border-border/30 pt-2">
                                            <button
                                                onClick={() => { logout(); setShowProfileDropdown(false) }}
                                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors"
                                            >
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
