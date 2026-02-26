// hrms-main/components/ui/skeleton.tsx
import { cn } from "@/lib/utils";

function Skeleton({
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div
            className={cn(
                "animate-shimmer rounded-md bg-gradient-to-r from-surface-muted via-surface-hover to-surface-muted bg-[length:400%_100%]",
                className
            )}
            {...props}
        />
    );
}

export { Skeleton };
