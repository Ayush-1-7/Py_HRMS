"use client";

import React, { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { createPortal } from "react-dom";
import { IoChevronDownOutline, IoCheckmarkOutline, IoSearchOutline, IoCloseOutline } from "react-icons/io5";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

export interface DropdownOption {
    value: string;
    label: string;
    icon?: React.ReactNode;
}

interface DropdownProps {
    options: DropdownOption[];
    value: string | string[];
    onChange: (value: any) => void;
    placeholder?: string;
    searchable?: boolean;
    multiSelect?: boolean;
    icon?: React.ReactNode;
    trigger?: React.ReactNode;
    className?: string;
    menuClassName?: string;
    itemClassName?: string;
    disabled?: boolean;
    error?: boolean;
}

export default function Dropdown({
    options,
    value,
    onChange,
    placeholder = "Select option",
    searchable = false,
    multiSelect = false,
    icon,
    trigger,
    className,
    menuClassName,
    itemClassName,
    disabled = false,
    error = false,
}: DropdownProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState("");
    const [coords, setCoords] = useState({ top: 0, left: 0, width: 0 });
    const containerRef = useRef<HTMLDivElement>(null);
    const menuRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Determine current label(s)
    const selectedLabel = useMemo(() => {
        if (multiSelect && Array.isArray(value)) {
            if (value.length === 0) return placeholder;
            if (value.length === 1) return options.find(o => o.value === value[0])?.label || placeholder;
            return `${value.length} selected`;
        }
        return options.find(o => o.value === value)?.label || placeholder;
    }, [value, options, multiSelect, placeholder]);

    const filteredOptions = useMemo(() => {
        if (!searchable || !searchTerm) return options;
        return options.filter(o =>
            o.label.toLowerCase().includes(searchTerm.toLowerCase())
        );
    }, [options, searchable, searchTerm]);

    const updateCoords = useCallback(() => {
        if (containerRef.current) {
            const rect = containerRef.current.getBoundingClientRect();
            const scrollY = window.scrollY;
            const spaceBelow = window.innerHeight - rect.bottom;
            const menuHeight = Math.min(filteredOptions.length * 40 + (searchable ? 50 : 0) + 10, 260);

            let top = rect.bottom + scrollY + 8;
            let left = rect.left;

            // Handle right alignment for small triggers (like action menus)
            if (trigger && rect.width < 100) {
                left = rect.right - 220; // Default width 220
            }

            if (spaceBelow < menuHeight && rect.top > menuHeight) {
                top = rect.top + scrollY - menuHeight - 8;
            }

            setCoords({
                top,
                left: Math.max(8, left),
                width: trigger ? 220 : rect.width,
            });
        }
    }, [filteredOptions.length, searchable, trigger]);

    useEffect(() => {
        if (isOpen) {
            updateCoords();
            window.addEventListener("scroll", updateCoords, true);
            window.addEventListener("resize", updateCoords);
            if (searchable && inputRef.current) {
                inputRef.current.focus();
            }
        }
        return () => {
            window.removeEventListener("scroll", updateCoords, true);
            window.removeEventListener("resize", updateCoords);
        };
    }, [isOpen, updateCoords, searchable]);

    // Click outside
    useEffect(() => {
        const handleClick = (e: MouseEvent) => {
            if (
                containerRef.current && !containerRef.current.contains(e.target as Node) &&
                menuRef.current && !menuRef.current.contains(e.target as Node)
            ) {
                setIsOpen(false);
            }
        };
        if (isOpen) document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [isOpen]);

    const toggleOption = (optionValue: string) => {
        if (multiSelect && Array.isArray(value)) {
            const newValue = Array.isArray(value) && value.includes(optionValue)
                ? value.filter(v => v !== optionValue)
                : [...(Array.isArray(value) ? value : []), optionValue];
            onChange(newValue);
        } else {
            onChange(optionValue);
            setIsOpen(false);
        }
    };

    const isSelected = (optionValue: string) => {
        if (multiSelect && Array.isArray(value)) {
            return value.includes(optionValue);
        }
        return value === optionValue;
    };

    const handleTriggerClick = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!disabled) {
            setIsOpen(!isOpen);
            setSearchTerm("");
        }
    };

    return (
        <div className={cn("relative inline-block", !trigger && "w-full", className)} ref={containerRef}>
            <div
                role="button"
                tabIndex={disabled ? -1 : 0}
                onClick={handleTriggerClick}
                onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                        e.preventDefault();
                        handleTriggerClick(e as any);
                    }
                }}
                aria-haspopup="listbox"
                aria-expanded={isOpen}
                className={trigger ? "cursor-pointer" : cn(
                    "w-full h-10 px-4 flex items-center justify-between gap-3 text-sm font-medium transition-all duration-150 cursor-pointer",
                    "bg-white dark:bg-slate-900 border rounded-xl",
                    "border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200",
                    "hover:border-slate-300 dark:hover:border-slate-700 active:scale-[0.99]",
                    "disabled:opacity-50 disabled:cursor-not-allowed",
                    isOpen && "ring-4 ring-slate-100 dark:ring-slate-800/50 border-slate-400 dark:border-slate-600",
                    error && "border-rose-500 dark:border-rose-500 ring-rose-500/10"
                )}
            >
                {trigger || (
                    <>
                        <div className="flex items-center gap-3 truncate">
                            {icon && <span className="text-slate-400 dark:text-slate-500 shrink-0">{icon}</span>}
                            <span className={cn("truncate", !value && "text-slate-400 dark:text-slate-500")}>
                                {selectedLabel}
                            </span>
                        </div>
                        <IoChevronDownOutline
                            className={cn("w-4 h-4 text-slate-400 transition-transform duration-200", isOpen && "rotate-180")}
                        />
                    </>
                )}
            </div>

            {isOpen && typeof document !== "undefined" && createPortal(
                <div
                    ref={menuRef}
                    style={{
                        position: "absolute",
                        top: coords.top,
                        left: coords.left,
                        width: menuClassName?.includes('w-[') ? undefined : coords.width,
                        zIndex: 9999,
                    }}
                    className={cn(
                        "fixed bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-2xl overflow-hidden",
                        "animate-in fade-in zoom-in-95 duration-150 ease-out",
                        menuClassName
                    )}
                >
                    {searchable && (
                        <div className="p-2 border-b border-slate-100 dark:border-slate-800 flex items-center gap-2">
                            <IoSearchOutline className="w-4 h-4 text-slate-400 ml-2" />
                            <input
                                ref={inputRef}
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search..."
                                className="w-full bg-transparent border-none outline-none text-sm text-slate-800 dark:text-slate-200 placeholder:text-slate-400 h-8"
                            />
                            {searchTerm && (
                                <button onClick={() => setSearchTerm("")} className="p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded">
                                    <IoCloseOutline className="w-4 h-4 text-slate-400" />
                                </button>
                            )}
                        </div>
                    )}

                    <div className="max-h-[260px] overflow-y-auto thin-scrollbar p-1">
                        {filteredOptions.length === 0 ? (
                            <div className="px-4 py-3 text-sm text-slate-400 text-center italic">
                                No results found
                            </div>
                        ) : (
                            filteredOptions.map((option) => (
                                <button
                                    key={option.value}
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        toggleOption(option.value);
                                    }}
                                    className={cn(
                                        "w-full h-10 px-3 flex items-center justify-between gap-3 text-sm font-medium rounded-lg transition-colors text-left",
                                        "text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800",
                                        isSelected(option.value) && "bg-slate-100/50 dark:bg-slate-800/50 text-slate-900 dark:text-white",
                                        itemClassName
                                    )}
                                >
                                    <div className="flex items-center gap-3 truncate">
                                        {option.icon && <span className="shrink-0">{option.icon}</span>}
                                        <span className="truncate">{option.label}</span>
                                    </div>
                                    {isSelected(option.value) && !trigger && (
                                        <IoCheckmarkOutline className="w-4 h-4 text-slate-900 dark:text-white shrink-0" />
                                    )}
                                </button>
                            ))
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
}
