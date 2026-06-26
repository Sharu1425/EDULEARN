import React, { createContext, useContext, useState, useEffect } from "react"

interface HeaderTitleCtx {
    override: string | null
    setOverride: (t: string | null) => void
}

const Ctx = createContext<HeaderTitleCtx>({ override: null, setOverride: () => {} })

export const HeaderTitleProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [override, setOverride] = useState<string | null>(null)
    return <Ctx.Provider value={{ override, setOverride }}>{children}</Ctx.Provider>
}

/** Read the current title override (used by the global Header). */
export const useHeaderTitleOverride = () => useContext(Ctx).override

/**
 * Set a dynamic header title from a page (e.g. the mastery roadmap subject).
 * Pass `undefined` to leave the route-map title in place. Clears on unmount.
 */
export const useHeaderTitle = (title?: string | null) => {
    const { setOverride } = useContext(Ctx)
    useEffect(() => {
        if (title === undefined) return
        setOverride(title || null)
        return () => setOverride(null)
    }, [title, setOverride])
}
