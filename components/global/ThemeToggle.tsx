"use client";

import { IoMoonOutline, IoSunnyOutline } from "react-icons/io5";
import { useTheme } from "@/components/providers/ThemeProvider";

export default function ThemeToggle() {
    const { theme, toggle } = useTheme();

    return (
        <button
            onClick={toggle}
            className="p-2.5 rounded-xl border border-border-default bg-surface-base hover:bg-surface-hover text-text-secondary hover:text-brand-primary transition-all active:scale-90 shadow-sm group"
            title={`Switch to ${theme === 'light' ? 'Dark' : 'Light'} Mode`}
        >
            <div className="relative w-5 h-5 overflow-hidden">
                <div
                    className={`absolute inset-0 transition-transform duration-500 ease-spring ${theme === 'light' ? 'translate-y-0' : '-translate-y-8'}`}
                >
                    <IoSunnyOutline size={20} />
                </div>
                <div
                    className={`absolute inset-0 transition-transform duration-500 ease-spring ${theme === 'dark' ? 'translate-y-0' : 'translate-y-8'}`}
                >
                    <IoMoonOutline size={20} />
                </div>
            </div>
        </button>
    );
}
