"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import { useTheme } from "@/components/providers/ThemeProvider";
import { sendChatMessage, executeAIAction } from "@/services/aiService";
import type { AIMessage, AIAction, AIContext } from "@/lib/ai/types";
import {
    IoSparklesOutline,
    IoCloseOutline,
    IoSendOutline,
    IoTrashOutline,
    IoCheckmarkCircleOutline,
    IoCloseCircleOutline,
    IoChevronDownOutline,
    IoGitCommitOutline,
    IoInformationCircleOutline,
    IoFlaskOutline,
} from "react-icons/io5";

/* ── Markdown-lite renderer ───────────────────────────── */
function renderMarkdown(text: string): string {
    return text
        .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
        .replace(/\*(.+?)\*/g, "<em>$1</em>")
        .replace(/`([^`]+)`/g, '<code class="ai-code">$1</code>')
        .replace(/^## (.+)$/gm, '<h3 class="ai-h3">$1</h3>')
        .replace(/^### (.+)$/gm, '<h4 class="ai-h4">$1</h4>')
        .replace(/^- (.+)$/gm, '<li class="ai-li">$1</li>')
        .replace(/(<li[^>]*>.*<\/li>\n?)+/g, (match) => `<ul class="ai-ul">${match}</ul>`)
        .replace(/^\d+\.\s(.+)$/gm, '<li class="ai-li-ordered">$1</li>')
        .replace(/\|(.+)\|/g, (match) => {
            // Simple table handling
            if (match.includes("---")) return "";
            const cells = match.split("|").filter(c => c.trim());
            const isHeader = cells.every(c => c.trim().length > 0);
            const tag = isHeader ? "td" : "td";
            return `<tr>${cells.map(c => `<${tag} class="ai-td">${c.trim()}</${tag}>`).join("")}</tr>`;
        })
        .replace(/(<tr>.*<\/tr>\n?)+/g, (match) => `<table class="ai-table">${match}</table>`)
        .replace(/\n\n/g, "<br/><br/>")
        .replace(/\n/g, "<br/>");
}

/* ── Typing Message Component ────────────────────────── */
function TypingText({ text, onComplete }: { text: string; onComplete?: () => void }) {
    const [displayedText, setDisplayedText] = useState("");
    const [index, setIndex] = useState(0);

    useEffect(() => {
        if (index < text.length) {
            const timeout = setTimeout(() => {
                setDisplayedText(prev => prev + text[index]);
                setIndex(prev => prev + 1);
            }, 10); // Adjust typing speed here
            return () => clearTimeout(timeout);
        } else if (onComplete) {
            onComplete();
        }
    }, [index, text, onComplete]);

    return (
        <div
            className="ai-response-content"
            dangerouslySetInnerHTML={{ __html: renderMarkdown(displayedText) }}
        />
    );
}

/* ── Main Component ───────────────────────────────────── */
export default function AIAssistant() {
    const [isOpen, setIsOpen] = useState(false);
    const [messages, setMessages] = useState<AIMessage[]>([]);
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [showScrollBtn, setShowScrollBtn] = useState(false);
    const [isSimulationMode, setIsSimulationMode] = useState(false);
    const [aiContext, setAiContext] = useState<Partial<AIContext>>({});
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const chatContainerRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const pathname = usePathname();
    const { theme } = useTheme();

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
        if (isOpen) scrollToBottom();
    }, [messages, isOpen, scrollToBottom]);

    useEffect(() => {
        if (isOpen) setTimeout(() => inputRef.current?.focus(), 200);
    }, [isOpen]);

    // Track scroll position
    useEffect(() => {
        const container = chatContainerRef.current;
        if (!container) return;
        const onScroll = () => {
            const { scrollTop, scrollHeight, clientHeight } = container;
            setShowScrollBtn(scrollHeight - scrollTop - clientHeight > 100);
        };
        container.addEventListener("scroll", onScroll);
        return () => container.removeEventListener("scroll", onScroll);
    }, [isOpen]);

    // Build context from current page
    const getContext = useCallback((): AIContext => {
        const ctx: AIContext = {
            page: pathname,
            userRole: "admin",
            ...aiContext
        };
        if (pathname?.includes("attendance")) {
            ctx.dateRange = {
                from: new Date().toISOString().slice(0, 10),
                to: new Date().toISOString().slice(0, 10),
            };
        }
        return ctx;
    }, [pathname, aiContext]);

    // Send message
    const handleSend = async () => {
        let text = input.trim();
        if (!text || isLoading) return;

        if (isSimulationMode && !/what\s*if|simulate/i.test(text)) {
            text = `What if ${text}`;
        }

        const userMsg: AIMessage = { role: "user", content: text, timestamp: Date.now() };
        setMessages(prev => [...prev, userMsg]);
        setInput("");
        setIsLoading(true);

        try {
            const response = await sendChatMessage(text, getContext(), messages);

            // Update conversational memory
            if (response.contextUpdate) {
                setAiContext(prev => ({ ...prev, ...response.contextUpdate }));
            }

            const assistantMsg: AIMessage = {
                role: "assistant",
                content: response.message,
                timestamp: Date.now(),
                actions: response.actions,
                reasoningTrace: response.reasoningTrace,
                explanation: response.explanation,
                suggestions: response.suggestions,
            };
            setMessages(prev => [...prev, assistantMsg]);
        } catch {
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: "⚠️ Sorry, I encountered an error. Please try again.",
                    timestamp: Date.now(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    // Handle action confirmation
    const handleActionConfirm = async (action: AIAction) => {
        setIsLoading(true);
        try {
            const result = await executeAIAction(action, true);
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: result.result || "✅ Action completed successfully.",
                    timestamp: Date.now(),
                },
            ]);
        } catch {
            setMessages(prev => [
                ...prev,
                {
                    role: "assistant",
                    content: "⚠️ Failed to execute the action. Please try again.",
                    timestamp: Date.now(),
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleActionCancel = (actionId: string) => {
        setMessages(prev => [
            ...prev,
            {
                role: "assistant",
                content: `❌ Action cancelled (\`${actionId}\`).`,
                timestamp: Date.now(),
            },
        ]);
    };

    const clearHistory = () => {
        setMessages([]);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    };

    return (
        <>
            {/* ── Floating Button ─────────────────────────────── */}
            <button
                id="ai-assistant-btn"
                onClick={() => setIsOpen(!isOpen)}
                className={`fixed bottom-6 right-6 z-[80] w-14 h-14 rounded-2xl flex items-center justify-center shadow-2xl transition-all duration-300 hover:scale-110 active:scale-95 group ${isOpen
                    ? "bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 rotate-90"
                    : "bg-gradient-to-br from-violet-600 to-indigo-600 text-white"
                    }`}
                title="AI Assistant"
            >
                {isOpen ? (
                    <IoCloseOutline size={24} />
                ) : (
                    <>
                        <IoSparklesOutline size={24} className="group-hover:rotate-12 transition-transform" />
                        {/* Pulse ring */}
                        <span className="absolute inset-0 rounded-2xl bg-violet-500/30 animate-ping opacity-75" />
                    </>
                )}
            </button>

            {/* ── Backdrop ────────────────────────────────────── */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-[81] bg-black/20 dark:bg-black/40 backdrop-blur-[2px] lg:bg-transparent lg:backdrop-blur-none lg:pointer-events-none"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* ── Panel ───────────────────────────────────────── */}
            <div
                className={`fixed right-0 top-0 h-full z-[82] w-full sm:w-[420px] shadow-2xl transition-transform duration-300 ease-out flex flex-col ${isOpen ? "translate-x-0" : "translate-x-full"
                    }`}
                style={{
                    background: theme === "dark" ? "hsl(222 47% 8%)" : "hsl(0 0% 99%)",
                    borderLeft: `1px solid ${theme === "dark" ? "hsl(220 14% 18%)" : "hsl(220 14% 92%)"}`,
                }}
            >
                {/* Header */}
                <div className="shrink-0 flex items-center gap-3 px-5 py-4 border-b border-slate-200 dark:border-slate-800"
                    style={{
                        background: theme === "dark"
                            ? "linear-gradient(135deg, hsl(260 50% 15%) 0%, hsl(222 47% 10%) 100%)"
                            : "linear-gradient(135deg, hsl(260 60% 96%) 0%, hsl(220 30% 98%) 100%)",
                    }}
                >
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white shadow-lg shadow-violet-500/25">
                        <IoSparklesOutline size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-black text-slate-900 dark:text-slate-100 tracking-tight">
                            HR Copilot
                        </h2>
                        <p className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest">
                            AI-Powered Assistant
                        </p>
                    </div>
                    <button
                        onClick={clearHistory}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                        title="Clear chat"
                    >
                        <IoTrashOutline size={16} />
                    </button>
                    <button
                        onClick={() => setIsOpen(false)}
                        className="p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors"
                    >
                        <IoCloseOutline size={20} />
                    </button>
                </div>

                {/* Messages Area */}
                <div
                    ref={chatContainerRef}
                    className="flex-1 overflow-y-auto px-4 py-4 space-y-4 thin-scrollbar relative"
                >
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center px-6 gap-4 opacity-80">
                            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-500/10 to-indigo-500/10 flex items-center justify-center">
                                <IoSparklesOutline size={28} className="text-violet-500" />
                            </div>
                            <div>
                                <h3 className="text-sm font-black text-slate-800 dark:text-slate-200 mb-2">
                                    How can I help?
                                </h3>
                                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                                    Ask me about employees, attendance, payroll, or generate reports.
                                </p>
                            </div>
                            <div className="w-full space-y-2 mt-2">
                                {[
                                    "How many employees joined this month?",
                                    "Who was absent yesterday?",
                                    "Show payroll summary for Finance",
                                    "Which department has highest absenteeism?",
                                ].map((q) => (
                                    <button
                                        key={q}
                                        onClick={() => {
                                            setInput(q);
                                            setTimeout(() => inputRef.current?.focus(), 50);
                                        }}
                                        className="w-full text-left px-3 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-xs font-bold text-slate-600 dark:text-slate-400 hover:border-violet-300 dark:hover:border-violet-700 hover:text-violet-600 dark:hover:text-violet-400 transition-all hover:bg-violet-50 dark:hover:bg-violet-500/5"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {messages.map((msg, idx) => (
                        <div
                            key={idx}
                            className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : "justify-start"} animate-fade-in-up`}
                        >
                            {msg.role === "assistant" && (
                                <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white mt-0.5">
                                    <IoSparklesOutline size={14} />
                                </div>
                            )}
                            <div
                                className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${msg.role === "user"
                                    ? "bg-violet-600 text-white rounded-br-md"
                                    : "bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 rounded-bl-md border border-slate-200 dark:border-slate-700/50"
                                    }`}
                            >
                                {msg.role === "assistant" ? (
                                    <div className="flex flex-col gap-3">
                                        {/* Reasoning Trace */}
                                        {msg.reasoningTrace && msg.reasoningTrace.length > 0 && (
                                            <details className="group border border-slate-200 dark:border-slate-700/50 rounded-xl overflow-hidden bg-white/50 dark:bg-slate-900/50">
                                                <summary className="flex items-center gap-2 px-3 py-2 cursor-pointer text-[11px] font-bold text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-colors select-none list-none [&::-webkit-details-marker]:hidden">
                                                    <IoGitCommitOutline size={14} className="text-violet-500" />
                                                    View AI Reasoning Steps ({msg.reasoningTrace.length})
                                                    <IoChevronDownOutline size={12} className="ml-auto transition-transform group-open:rotate-180" />
                                                </summary>
                                                <div className="px-3 pb-3 pt-1 border-t border-slate-100 dark:border-slate-800 space-y-2">
                                                    {msg.reasoningTrace.map((step, i) => (
                                                        <div key={i} className="text-[10px] pl-3 border-l-2 border-violet-200 dark:border-violet-500/30">
                                                            <div className="font-bold text-slate-700 dark:text-slate-300">{step.step}</div>
                                                            <div className="text-slate-500 dark:text-slate-400">{step.action}</div>
                                                            <div className="text-violet-600 dark:text-violet-400 mt-0.5 italic">→ {step.result}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </details>
                                        )}

                                        {/* Main Content */}
                                        {idx === messages.length - 1 && msg.role === "assistant" ? (
                                            <TypingText text={msg.content} />
                                        ) : (
                                            <div
                                                className="ai-response-content"
                                                dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                            />
                                        )}

                                        {/* Explanation */}
                                        {msg.explanation && (
                                            <div className="mt-1 flex items-start gap-2 text-[10.5px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-200/50 dark:border-slate-700/50 leading-relaxed italic">
                                                <IoInformationCircleOutline size={14} className="shrink-0 text-amber-500 mt-0.5" />
                                                <p>{msg.explanation}</p>
                                            </div>
                                        )}

                                        {/* Suggestions */}
                                        {msg.suggestions && (
                                            <div className="mt-4 space-y-3 pt-3 border-t border-slate-200 dark:border-slate-700/50">
                                                {msg.suggestions.insights && msg.suggestions.insights.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black text-violet-500 dark:text-violet-400 uppercase tracking-widest flex items-center gap-1.5">
                                                            <IoFlaskOutline size={12} /> Insights
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {msg.suggestions.insights.map((s, i) => (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => { setInput(s); setTimeout(() => inputRef.current?.focus(), 50); }}
                                                                    className="px-2.5 py-1.5 rounded-lg bg-violet-50 dark:bg-violet-900/20 border border-violet-100 dark:border-violet-800 text-[10.5px] font-bold text-violet-700 dark:text-violet-400 hover:bg-violet-100 transition-all"
                                                                >
                                                                    {s}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {msg.suggestions.questions && msg.suggestions.questions.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                                                            <IoInformationCircleOutline size={12} /> Related Questions
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {msg.suggestions.questions.map((q, i) => (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => { setInput(q); setTimeout(() => inputRef.current?.focus(), 50); }}
                                                                    className="px-2.5 py-1.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-[10.5px] font-bold text-slate-600 dark:text-slate-400 hover:border-violet-400 transition-all shadow-sm"
                                                                >
                                                                    {q}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}

                                                {msg.suggestions.actions && msg.suggestions.actions.length > 0 && (
                                                    <div className="space-y-2">
                                                        <p className="text-[9px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                                                            <IoCheckmarkCircleOutline size={12} /> Recommended Actions
                                                        </p>
                                                        <div className="flex flex-wrap gap-2">
                                                            {msg.suggestions.actions.map((a, i) => (
                                                                <button
                                                                    key={i}
                                                                    onClick={() => { setInput(a); setTimeout(() => inputRef.current?.focus(), 50); }}
                                                                    className="px-2.5 py-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 text-[10.5px] font-bold text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 transition-all"
                                                                >
                                                                    {a}
                                                                </button>
                                                            ))}
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <span>{msg.content}</span>
                                )}

                                {/* Action buttons */}
                                {msg.actions && msg.actions.length > 0 && (
                                    <div className="mt-3 pt-3 border-t border-slate-200 dark:border-slate-700 space-y-2">
                                        {msg.actions.map((action) => (
                                            <div key={action.id} className="flex items-center gap-2">
                                                <button
                                                    onClick={() => handleActionConfirm(action)}
                                                    disabled={isLoading}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500 text-white text-[11px] font-bold hover:bg-emerald-600 transition-colors disabled:opacity-50"
                                                >
                                                    <IoCheckmarkCircleOutline size={14} />
                                                    Confirm
                                                </button>
                                                <button
                                                    onClick={() => handleActionCancel(action.id)}
                                                    disabled={isLoading}
                                                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[11px] font-bold hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors disabled:opacity-50"
                                                >
                                                    <IoCloseCircleOutline size={14} />
                                                    Cancel
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}

                    {/* Typing indicator */}
                    {isLoading && (
                        <div className="flex gap-2.5 animate-fade-in-up">
                            <div className="shrink-0 w-7 h-7 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-600 flex items-center justify-center text-white">
                                <IoSparklesOutline size={14} />
                            </div>
                            <div className="bg-slate-100 dark:bg-slate-800/80 rounded-2xl rounded-bl-md px-4 py-3 border border-slate-200 dark:border-slate-700/50">
                                <div className="flex gap-1.5">
                                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "0ms" }} />
                                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "150ms" }} />
                                    <span className="w-2 h-2 rounded-full bg-violet-400 animate-bounce" style={{ animationDelay: "300ms" }} />
                                </div>
                            </div>
                        </div>
                    )}

                    <div ref={messagesEndRef} />
                </div>

                {/* Scroll to bottom */}
                {showScrollBtn && (
                    <button
                        onClick={scrollToBottom}
                        className="absolute bottom-24 left-1/2 -translate-x-1/2 z-10 w-8 h-8 rounded-full bg-violet-600 text-white flex items-center justify-center shadow-lg hover:bg-violet-700 transition-colors"
                    >
                        <IoChevronDownOutline size={16} />
                    </button>
                )}

                {/* Input Area */}
                <div className="shrink-0 px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm">
                    {/* Simulation Toggle */}
                    <div className="flex items-center justify-between mb-3 px-1">
                        <label className="flex items-center gap-2 cursor-pointer group" onClick={(e) => { e.preventDefault(); setIsSimulationMode(!isSimulationMode); }}>
                            <div className={`relative w-8 h-4.5 rounded-full transition-colors duration-300 flex items-center ${isSimulationMode ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-700'}`}>
                                <div className={`absolute left-0.5 w-3.5 h-3.5 bg-white rounded-full shadow-sm transition-transform duration-300 ${isSimulationMode ? 'translate-x-3.5' : 'translate-x-0'}`} />
                            </div>
                            <span className={`text-[10px] font-bold uppercase tracking-widest transition-colors ${isSimulationMode ? 'text-amber-600 dark:text-amber-500' : 'text-slate-400 dark:text-slate-600 group-hover:text-slate-500'}`}>
                                <IoFlaskOutline size={12} className="inline mr-1 -mt-0.5" />
                                Simulation Mode
                            </span>
                        </label>
                    </div>

                    <div className="flex items-end gap-2">
                        <textarea
                            ref={inputRef}
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            placeholder={isSimulationMode ? "Ask 'What if absenteeism drops by 5%?'" : "Ask me anything about your HR data…"}
                            rows={1}
                            className="flex-1 resize-none bg-slate-100 dark:bg-slate-800 rounded-xl px-4 py-3 text-[13px] font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-violet-500/30 border border-transparent focus:border-violet-400 dark:focus:border-violet-600 transition-all"
                            style={{ minHeight: "44px", maxHeight: "120px" }}
                            onInput={(e) => {
                                const el = e.currentTarget;
                                el.style.height = "auto";
                                el.style.height = Math.min(el.scrollHeight, 120) + "px";
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || isLoading}
                            className="w-11 h-11 shrink-0 rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white flex items-center justify-center shadow-lg shadow-violet-500/25 hover:shadow-xl hover:scale-105 active:scale-95 transition-all disabled:opacity-40 disabled:shadow-none disabled:scale-100"
                        >
                            <IoSendOutline size={18} />
                        </button>
                    </div>
                    <p className="text-center text-[9px] font-bold text-slate-400 dark:text-slate-600 mt-2 tracking-wider uppercase">
                        AI responses are data-driven • No hallucination
                    </p>
                </div>
            </div>

            {/* ── Inline Styles for AI content ──────────────── */}
            <style jsx global>{`
        .ai-response-content .ai-h3 {
          font-size: 14px;
          font-weight: 800;
          margin: 8px 0 4px;
          color: inherit;
        }
        .ai-response-content .ai-h4 {
          font-size: 13px;
          font-weight: 700;
          margin: 6px 0 3px;
          color: inherit;
        }
        .ai-response-content .ai-ul {
          margin: 4px 0;
          padding-left: 8px;
          list-style: none;
        }
        .ai-response-content .ai-li {
          padding: 2px 0;
          font-size: 12px;
        }
        .ai-response-content .ai-li::before {
          content: "•";
          margin-right: 6px;
          color: rgb(139 92 246);
          font-weight: bold;
        }
        .ai-response-content .ai-code {
          background: rgba(139, 92, 246, 0.1);
          padding: 1px 5px;
          border-radius: 4px;
          font-size: 11px;
          font-family: ui-monospace, monospace;
        }
        .ai-response-content .ai-table {
          width: 100%;
          border-collapse: collapse;
          margin: 6px 0;
          font-size: 11px;
        }
        .ai-response-content .ai-td {
          padding: 4px 6px;
          border-bottom: 1px solid rgba(148, 163, 184, 0.2);
          text-align: left;
        }
        .ai-response-content .ai-table tr:first-child .ai-td {
          font-weight: 800;
          font-size: 10px;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          color: rgb(139 92 246);
        }
      `}</style>
        </>
    );
}
