"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  Send,
  X,
  Sparkles,
  Package,
  Briefcase,
  Truck,
  Phone,
  Minus,
  MessageCircle,
} from "lucide-react";
import { assistantApi } from "@/lib/api";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useT } from "@/lib/i18n/useT";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/useFocusTrap";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface AssistantConfig {
  enabled: boolean;
  whatsapp_enabled: boolean;
  whatsapp_number: string;
  welcome_en: string;
  welcome_bn: string;
}

const SESSION_KEY = "abo_assistant_session";
const DEFAULT_CONFIG: AssistantConfig = {
  enabled: true,
  whatsapp_enabled: true,
  whatsapp_number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "8801825007977",
  welcome_en: "",
  welcome_bn: "",
};

function formatMessageContent(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-brand-700 dark:text-brand-300">
          {part.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{part}</span>;
  });
}

function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-end gap-2.5 animate-fade-in" aria-live="polite" aria-label={label}>
      <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-md shadow-brand-500/20 flex-shrink-0">
        <Bot className="w-4 h-4 text-white" />
      </div>
      <div className="px-4 py-3 rounded-2xl rounded-bl-md bg-white/90 dark:bg-white/10 border border-gray-100/80 dark:border-white/10 shadow-sm">
        <div className="flex items-center gap-1.5 h-4">
          <span className="assistant-typing-dot w-2 h-2 rounded-full bg-brand-400" />
          <span className="assistant-typing-dot w-2 h-2 rounded-full bg-brand-400" />
          <span className="assistant-typing-dot w-2 h-2 rounded-full bg-brand-400" />
        </div>
      </div>
    </div>
  );
}

export default function AssistantWidget() {
  const flagEnabled = useFeatureFlag("feature_assistant_chat", true);
  const t = useT();
  const { lang } = useLanguageStore();
  const [config, setConfig] = useState<AssistantConfig>(DEFAULT_CONFIG);
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const trapRef = useFocusTrap(open);

  const enabled = flagEnabled && config.enabled;

  const welcomeText = useMemo(() => {
    const custom = lang === "bn" ? config.welcome_bn : config.welcome_en;
    return custom || t("assistant_welcome");
  }, [config.welcome_bn, config.welcome_en, lang, t]);

  const whatsappUrl = useMemo(() => {
    const number = config.whatsapp_number.replace(/\D/g, "");
    const text = lang === "bn"
      ? "হ্যালো ABO Enterprise, আমার সাহায্য দরকার।"
      : "Hello ABO Enterprise, I need help.";
    return `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
  }, [config.whatsapp_number, lang]);

  const quickActions = useMemo(() => {
    const actions = [
      { icon: Package, label: t("assistant_quick_products"), message: lang === "bn" ? "পণ্য দেখান" : "Show products" },
      { icon: Briefcase, label: t("assistant_quick_services"), message: lang === "bn" ? "সেবা সম্পর্কে জানুন" : "Tell me about services" },
      { icon: Truck, label: t("assistant_quick_track"), message: lang === "bn" ? "অর্ডার ট্র্যাক করতে চাই" : "I want to track my order" },
      { icon: Phone, label: t("assistant_quick_contact"), message: lang === "bn" ? "যোগাযোগের তথ্য দিন" : "Contact information" },
    ];
    if (config.whatsapp_enabled) {
      actions.push({
        icon: MessageCircle,
        label: t("assistant_quick_whatsapp"),
        message: "__whatsapp__",
      });
    }
    return actions;
  }, [t, lang, config.whatsapp_enabled]);

  useEffect(() => {
    assistantApi.config()
      .then((r) => {
        if (r.data.data) setConfig({ ...DEFAULT_CONFIG, ...r.data.data });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setSessionId(localStorage.getItem(SESSION_KEY));
    }
  }, []);

  useEffect(() => {
    if (!sessionId || !enabled) return;
    setHistoryLoading(true);
    assistantApi.history(sessionId, 30)
      .then((r) => {
        const history = r.data.data ?? [];
        if (history.length > 0) {
          setMessages(history.map((m) => ({ role: m.role as "user" | "assistant", content: m.content })));
        }
      })
      .catch(() => {})
      .finally(() => setHistoryLoading(false));
  }, [sessionId, enabled]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, loading]);

  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => inputRef.current?.focus(), 300);
      return () => clearTimeout(timer);
    }
  }, [open]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const sendText = useCallback(
    async (text: string) => {
      if (text === "__whatsapp__") {
        window.open(whatsappUrl, "_blank", "noopener,noreferrer");
        return;
      }

      const trimmed = text.trim();
      if (!trimmed || loading) return;

      setInput("");
      setSuggestions([]);
      setMessages((prev) => [...prev, { role: "user", content: trimmed }]);
      setLoading(true);

      try {
        const res = await assistantApi.chat({
          message: trimmed,
          session_id: sessionId ?? undefined,
          language: lang,
        });
        const data = res.data.data;
        if (data?.session_id) {
          setSessionId(data.session_id);
          localStorage.setItem(SESSION_KEY, data.session_id);
        }
        if (data?.suggestions?.length) {
          setSuggestions(data.suggestions);
        }
        setMessages((prev) => [...prev, { role: "assistant", content: data?.message ?? "" }]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: t("assistant_error") },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, sessionId, lang, t, whatsappUrl]
  );

  const sendMessage = useCallback(() => sendText(input), [input, sendText]);

  if (!enabled) return null;

  return (
    <>
      {open && (
        <div
          className="fixed inset-0 z-40 animate-fade-in lg:bg-transparent"
          style={{ background: "rgba(10, 22, 40, 0.35)", backdropFilter: "blur(3px)" }}
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
      )}

      {open && (
        <div
          ref={trapRef}
          role="dialog"
          aria-modal="true"
          aria-label={t("assistant_title")}
          className={cn(
            "fixed z-50 flex flex-col overflow-hidden assistant-panel",
            "animate-slide-up",
            "inset-x-3 bottom-[calc(var(--mobile-float-bottom)+4.5rem)]",
            "h-[min(72vh,560px)] rounded-3xl",
            "lg:inset-x-auto lg:bottom-24 lg:right-6 lg:w-[400px] lg:h-[min(78vh,600px)]",
            lang === "bn" && "font-bangla"
          )}
        >
          <div className="relative flex-shrink-0 gradient-brand px-4 py-4 overflow-hidden">
            <div
              className="absolute inset-0 opacity-30"
              style={{
                backgroundImage:
                  "radial-gradient(circle at 20% 50%, rgba(255,255,255,0.25) 0%, transparent 50%), radial-gradient(circle at 80% 0%, rgba(233,30,99,0.2) 0%, transparent 40%)",
              }}
            />
            <div className="relative flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                <div className="relative flex-shrink-0">
                  <div className="w-11 h-11 rounded-2xl glass-panel flex items-center justify-center shadow-lg">
                    <Bot className="w-5 h-5 text-white" />
                  </div>
                  <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 border-2 border-brand-700 rounded-full" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h2 className="text-white font-bold text-base leading-tight truncate">
                      {t("assistant_title")}
                    </h2>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300 flex-shrink-0" />
                  </div>
                  <p className="text-white/75 text-xs mt-0.5 truncate">{t("assistant_subtitle")}</p>
                  <p className="text-emerald-300/90 text-[10px] font-medium mt-1 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    {t("assistant_online")}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="p-2 rounded-xl glass-panel hover:bg-white/25 transition-colors flex-shrink-0"
                aria-label="Close assistant"
              >
                <X className="w-5 h-5 text-white" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto assistant-chat-bg px-4 py-4 space-y-4 scrollbar-hide">
            {messages.length === 0 && !historyLoading && (
              <div className="animate-fade-in space-y-4 pt-2">
                <div className="text-center px-2">
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl gradient-brand shadow-lg shadow-brand-500/25 mb-3">
                    <Sparkles className="w-7 h-7 text-white" />
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed max-w-[280px] mx-auto">
                    {welcomeText}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {quickActions.map(({ icon: Icon, label, message }) => (
                    <button
                      key={label}
                      type="button"
                      onClick={() => sendText(message)}
                      disabled={loading}
                      className={cn(
                        "flex flex-col items-start gap-2 p-3 rounded-2xl text-left transition-all duration-200",
                        "bg-white/80 dark:bg-white/5 border border-gray-100/80 dark:border-white/10",
                        "hover:border-brand-200 dark:hover:border-brand-500/30 hover:shadow-md hover:-translate-y-0.5",
                        "disabled:opacity-50 disabled:pointer-events-none",
                        message === "__whatsapp__" && "border-green-200/80 hover:border-green-300"
                      )}
                    >
                      <span className={cn(
                        "w-8 h-8 rounded-xl flex items-center justify-center",
                        message === "__whatsapp__"
                          ? "bg-green-50 dark:bg-green-900/40"
                          : "bg-brand-50 dark:bg-brand-900/40"
                      )}>
                        <Icon className={cn(
                          "w-4 h-4",
                          message === "__whatsapp__"
                            ? "text-green-600 dark:text-green-300"
                            : "text-brand-600 dark:text-brand-300"
                        )} />
                      </span>
                      <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 leading-snug">
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {historyLoading && (
              <div className="flex justify-center py-8">
                <TypingIndicator label={t("assistant_typing")} />
              </div>
            )}

            {messages.map((msg, i) => (
              <div
                key={i}
                className={cn(
                  "flex gap-2.5 animate-fade-in",
                  msg.role === "user" ? "flex-row-reverse" : "flex-row"
                )}
              >
                {msg.role === "assistant" && (
                  <div className="w-8 h-8 rounded-xl gradient-brand flex items-center justify-center shadow-md shadow-brand-500/20 flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={cn(
                    "max-w-[82%] px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap",
                    msg.role === "user"
                      ? "rounded-2xl rounded-br-md bg-gradient-to-br from-accent-500 to-accent-600 text-white shadow-md shadow-accent-500/20"
                      : "rounded-2xl rounded-bl-md bg-white/90 dark:bg-white/10 text-gray-800 dark:text-gray-100 border border-gray-100/80 dark:border-white/10 shadow-sm"
                  )}
                >
                  {formatMessageContent(msg.content)}
                </div>
              </div>
            ))}

            {loading && <TypingIndicator label={t("assistant_typing")} />}

            {suggestions.length > 0 && !loading && (
              <div className="flex flex-wrap gap-2 pt-1 animate-fade-in">
                {suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => sendText(s)}
                    className="px-3 py-1.5 text-xs font-medium rounded-full border border-brand-200/80 dark:border-brand-500/30 bg-white/80 dark:bg-white/5 text-brand-700 dark:text-brand-300 hover:bg-brand-50 dark:hover:bg-brand-900/30 transition-colors"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}

            <div ref={bottomRef} />
          </div>

          <div className="flex-shrink-0 p-3 border-t border-gray-100/80 dark:border-white/10 bg-white/60 dark:bg-[#0a1628]/60 backdrop-blur-md">
            {config.whatsapp_enabled && (
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full mb-2 py-2.5 rounded-xl bg-green-500 hover:bg-green-600 text-white text-sm font-semibold transition-colors"
              >
                <MessageCircle className="w-4 h-4" />
                {t("assistant_quick_whatsapp")}
              </a>
            )}
            <div className="flex items-center gap-2">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage()}
                placeholder={t("assistant_placeholder")}
                className={cn(
                  "flex-1 px-4 py-3 text-sm rounded-2xl transition-all duration-200",
                  "bg-white dark:bg-white/5 border border-gray-200/80 dark:border-white/10",
                  "text-gray-900 dark:text-gray-100 placeholder-gray-400",
                  "focus:outline-none focus:ring-2 focus:ring-brand-400/40 focus:border-brand-300"
                )}
                disabled={loading}
                aria-label={t("assistant_placeholder")}
              />
              <button
                type="button"
                onClick={sendMessage}
                disabled={loading || !input.trim()}
                className={cn(
                  "p-3 rounded-2xl transition-all duration-200 flex-shrink-0",
                  "bg-gradient-to-br from-brand-500 to-brand-600 text-white",
                  "shadow-md shadow-brand-500/25 hover:shadow-lg hover:shadow-brand-500/35",
                  "hover:-translate-y-px active:translate-y-0",
                  "disabled:opacity-40 disabled:shadow-none disabled:translate-y-0"
                )}
                aria-label="Send message"
              >
                <Send className="w-5 h-5" />
              </button>
            </div>
            <p className="text-[10px] text-center text-gray-400 dark:text-gray-500 mt-2">
              {t("assistant_powered")}
            </p>
          </div>
        </div>
      )}

      <div className="fixed bottom-mobile-float right-4 lg:bottom-6 lg:right-6 z-50">
        {open && (
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute -top-12 right-0 w-9 h-9 rounded-full bg-white/90 dark:bg-slate-800/90 border border-gray-200/80 dark:border-white/10 shadow-md flex items-center justify-center text-gray-500 hover:text-gray-800 dark:hover:text-white transition-colors animate-scale-in"
            aria-label="Minimize assistant"
          >
            <Minus className="w-4 h-4" />
          </button>
        )}

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className={cn(
            "relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300",
            "bg-gradient-to-br from-brand-500 via-brand-600 to-brand-700 text-white",
            "shadow-lg shadow-brand-500/30 hover:shadow-xl hover:shadow-brand-500/40",
            open ? "scale-95 rotate-0" : "hover:scale-110",
            !open && "assistant-fab-ring"
          )}
          style={
            !open
              ? {
                  boxShadow:
                    "0 0 0 0 rgba(30, 91, 168, 0.4), 0 8px 24px rgba(30, 91, 168, 0.35)",
                }
              : undefined
          }
          aria-label={open ? "Close assistant" : "Open assistant"}
          aria-expanded={open}
        >
          {!open && (
            <span
              className="absolute inset-0 rounded-full border-2 border-brand-400/50 assistant-fab-ring pointer-events-none"
              aria-hidden="true"
            />
          )}
          {open ? <X className="w-6 h-6" /> : <Bot className="w-6 h-6" />}
        </button>
      </div>
    </>
  );
}
