"use client";

import { useTheme } from "next-themes";
import { Toaster as Sonner } from "sonner";

export function Toaster() {
    const { theme } = useTheme();

    return (
        <Sonner
            theme={theme as "light" | "dark" | "system"}
            className="toaster group"
            toastOptions={{
                classNames: {
                    toast:
                        "group toast group-[.toaster]:bg-surface-base group-[.toaster]:text-text-primary group-[.toaster]:border-border-default group-[.toaster]:shadow-[var(--shadow-lg)] dark:group-[.toaster]:backdrop-blur-xl",
                    description: "group-[.toast]:text-text-secondary",
                    actionButton:
                        "group-[.toast]:bg-brand-primary group-[.toast]:text-white",
                    cancelButton:
                        "group-[.toast]:bg-surface-muted group-[.toast]:text-text-secondary group-[.toast]:border-border-default",
                },
            }}
        />
    );
}
