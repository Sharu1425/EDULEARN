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

    // Add scroll listener for glass effect
    useEffect(() => {
        const handleScroll = () => {
            setScrolled(window.scrollY > 20)
        }
        window.addEventListener("scroll", handleScroll)
        return () => window.removeEventListener("scroll", handleScroll)
    }, [])

    // Close dropdown on click outside or route change
    useEffect(() => {
        setShowProfileDropdown(false)
    }, [location.pathname])

    const handleLogout = () => {
        logout()
    }

    return (
        <header
            className={cn(
                "fixed top-0 left-0 z-40 w-full transition-all duration-300",
                scrolled
                    ? "bg-background/80 backdrop-blur-xl border-b border-border/40 shadow-sm"
                    : "bg-transparent border-b border-transparent"
            )}
        >
            <div className="flex h-16 items-center justify-between px-4 sm:px-6 lg:px-8">
                {/* Left Side: Mobile Menu Toggle & Brand Logo */}
                <div className="flex items-center gap-4">
                    <button
                        onClick={onMenuClick}
                        className="lg:hidden rounded-lg p-2 text-muted-foreground hover:bg-muted/50 hover:text-foreground transition-colors"
                    >
                        <Menu className="h-5 w-5" />
                    </button>

                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white font-bold shadow-sm">
                            EL
                        </div>
                        <span className="font-heading font-bold text-lg text-foreground tracking-tight hidden sm:block">EduLearn</span>
                    </div>
                </div>

                {/* Right Side: Actions & Profile */}
                <div className="flex items-center gap-2 sm:gap-4">

                    {/* Theme Toggle */}
                    <button
                        onClick={toggleColorScheme}
                        className="flex items-center justify-center h-9 w-9 rounded-full text-muted-foreground hover:bg-muted/50 transition-colors"
                        aria-label="Toggle theme"
                    >
                        {colorScheme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                    </button>

                    {/* Notifications */}
                    <button className="relative flex items-center justify-center h-9 w-9 rounded-full text-muted-foreground hover:bg-muted/50 transition-colors">
                        <Bell className="h-4 w-4" />
                        <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive border-2 border-background animate-pulse" />
                    </button>

                    <div className="h-6 w-[1px] bg-border/50 mx-1 hidden sm:block" />

                    {/* Profile Dropdown */}
                    <div className="relative">
                        <button
                            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                            className="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 hover:bg-muted/50 border border-transparent hover:border-border/30 transition-all"
                        >
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary font-bold shadow-inner uppercase">
                                {(user?.name || user?.username || user?.email || "U")[0]}
                            </div>
                            <div className="hidden md:flex flex-col items-start pr-1">
                                <span className="text-sm font-semibold leading-tight text-foreground truncate max-w-[120px]">
                                    {user?.name || user?.username || user?.email?.split('@')[0] || "User"}
                                </span>
                                <span className="text-[10px] uppercase font-bold tracking-wider text-muted-foreground">
                                    {user?.role || "Student"}
                                </span>
                            </div>
                        </button>

                        {/* Dropdown Menu */}
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
                                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                        animate={{ opacity: 1, scale: 1, y: 0 }}
                                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                        transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                        className="absolute right-0 top-full mt-2 w-56 origin-top-right rounded-2xl border border-border/50 bg-card p-2 shadow-xl z-50 overflow-hidden"
                                    >
                                        <div className="px-3 py-3 border-b border-border/30 mb-2 md:hidden">
                                            <p className="text-sm font-semibold text-foreground">{user?.email || "user@example.com"}</p>
                                            <p className="text-xs text-muted-foreground capitalize">{user?.role || "Student"}</p>
                                        </div>

                                        <div className="space-y-1">
                                            <button
                                                onClick={() => navigate("/profile")}
                                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 hover:text-primary transition-colors"
                                            >
                                                <UserIcon className="h-4 w-4" />
                                                My Profile
                                            </button>
                                            <button
                                                onClick={() => navigate("/settings")}
                                                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-foreground hover:bg-muted/50 hover:text-primary transition-colors"
                                            >
                                                <Settings className="h-4 w-4" />
                                                Settings
                                            </button>
                                        </div>

                                        <div className="mt-2 border-t border-border/30 pt-2">
                                            <button
                                                onClick={handleLogout}
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
