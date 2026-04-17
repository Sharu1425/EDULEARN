import React from "react"
import { cn } from "../../utils/cn"

interface SkeletonProps {
    className?: string
    lines?: number
    animated?: boolean
}

export const Skeleton: React.FC<SkeletonProps> = ({
    className,
    animated = true,
}) => (
    <div
        className={cn(
            "rounded-lg bg-muted/60",
            animated && "animate-pulse",
            className
        )}
        aria-hidden="true"
    />
)

/** Card-shaped skeleton placeholder */
export const CardSkeleton: React.FC<{ lines?: number; className?: string }> = ({
    lines = 3,
    className,
}) => (
    <div className={cn("rounded-2xl border border-border/50 bg-card p-5 space-y-3", className)}>
        <Skeleton className="h-4 w-2/5" />
        <Skeleton className="h-3 w-full" />
        {lines >= 2 && <Skeleton className="h-3 w-4/5" />}
        {lines >= 3 && <Skeleton className="h-3 w-3/5" />}
    </div>
)

/** Row-shaped skeleton (for list items) */
export const RowSkeleton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={cn("flex items-center gap-3 py-3", className)}>
        <Skeleton className="h-9 w-9 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-3 w-1/2" />
        </div>
    </div>
)

/** Dashboard stats card skeleton */
export const StatCardSkeleton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={cn("rounded-2xl border border-border/50 bg-card p-5", className)}>
        <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-3 w-1/3" />
            <Skeleton className="h-8 w-8 rounded-xl" />
        </div>
        <Skeleton className="h-8 w-2/5 mb-1" />
        <Skeleton className="h-3 w-1/2" />
    </div>
)

export default Skeleton
