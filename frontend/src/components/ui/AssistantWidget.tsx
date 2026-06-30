"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  Send,
  X,
  Sparkles,
  Package,
  Briefcase,
  Truck,
  Phone,
  Minus,
  ExternalLink,
} from "lucide-react";
import { assistantApi, type AssistantFeatures } from "@/lib/api";
import { useFeatureFlag } from "@/hooks/useFeatureFlag";
import { useT } from "@/lib/i18n/useT";
import { useLanguageStore } from "@/store/language";
import { cn } from "@/lib/utils";
import { useFocusTrap } from "@/lib/useFocusTrap";
import Link from "next/link";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
  links?: AssistantLink[];
}

interface AssistantLink {
  label: string;
  label_bn?: string;
  url: string;
  type?: string;
}

interface AssistantConfig {
  enabled: boolean;
  whatsapp_enabled: boolean;
  whatsapp_number: string;
  welcome_en: string;
  welcome_bn: string;
  features?: AssistantFeatures;
}

const DEFAULT_FEATURES: AssistantFeatures = {
  orders: true,
  order_tracking: true,
  bookings: true,
  booking_tracking: true,
  leads: true,
  lead_tracking: true,
  product_search: true,
  service_info: true,
  coupons: true,
  invoices: true,
};

const SESSION_KEY = "abo_assistant_session";
const DEFAULT_CONFIG: AssistantConfig = {
  enabled: true,
  whatsapp_enabled: false,
  whatsapp_number: process.env.NEXT_PUBLIC_WHATSAPP_NUMBER ?? "8801825007977",
  welcome_en: "",
  welcome_bn: "",
  features: DEFAULT_FEATURES,
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

function AssistantAvatar({ size = 32, className }: { size?: number; className?: string }) {
  return (
    <Image
      src="/logo.jpg"
      alt="ABO Enterprise"
      width={size}
      height={size}
      className={cn("rounded-xl object-cover shadow-sm", className)}
    />
  );
}

function TypingIndicator({ label }: { label: string }) {
  return (
    <div className="flex items-end gap-2.5 animate-fade-in" aria-live="polite" aria-label={label}>
      <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 ring-2 ring-brand-200/50">
        <AssistantAvatar size={32} className="w-full h-full" />
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
  const [footerNear, setFooterNear] = useState(false);

  useEffect(() => {
    const footer = document.querySelector("footer");
    if (!footer) return;
    const obs = new IntersectionObserver(
      ([entry]) => setFooterNear(entry.isIntersecting),
      { threshold: 0.15, rootMargin: "0px 0px -32px 0px" }
    );
    obs.observe(footer);
    return () => obs.disconnect();
  }, []);
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

  const quickActions = useMemo(() => {
    const f = config.features ?? DEFAULT_FEATURES;
    const all = [
      { icon: Package, label: lang === "bn" ? "অর্ডার করুন" : "Place order", message: lang === "bn" ? "অর্ডার করতে চাই" : "I want to place an order", enabled: f.orders },
      { icon: Briefcase, label: lang === "bn" ? "সেবা বুক" : "Book service", message: lang === "bn" ? "সেবা বুক করতে চাই" : "I want to book a service", enabled: f.bookings },
      { icon: Truck, label: t("assistant_quick_track"), message: lang === "bn" ? "অর্ডার ট্র্যাক করতে চাই" : "I want to track my order", enabled: f.order_tracking },
      { icon: Phone, label: lang === "bn" ? "বুকিং ট্র্যাক" : "Track booking", message: lang === "bn" ? "বুকিং ট্র্যাক করতে চাই" : "Track my booking", enabled: f.booking_tracking },
      { icon: Package, label: lang === "bn" ? "পণ্য দেখুন" : "Products", message: lang === "bn" ? "পণ্য দেখান" : "Show products", enabled: f.product_search },
      { icon: Phone, label: lang === "bn" ? "যোগাযোগ" : "Contact", message: lang === "bn" ? "যোগাযোগের তথ্য দিন" : "Contact information", enabled: true },
    ];
    return all.filter((a) => a.enabled).slice(0, 4);
  }, [t, lang, config.features]);

  const parseLinks = (data?: Record<string, unknown>): AssistantLink[] => {
    const raw = data?.links;
    if (!Array.isArray(raw)) return [];
    return raw.filter((l): l is AssistantLink =>
      typeof l === "object" && l !== null && "url" in l && typeof (l as AssistantLink).url === "string"
    );
  };

  useEffect(() => {
    assistantApi.config()
      .then((r) => {
        if (r.data.data) setConfig({ ...DEFAULT_CONFIG, ...r.data.data, features: { ...DEFAULT_FEATURES, ...r.data.data.features } });
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
        const links = parseLinks(data?.data as Record<string, unknown> | undefined);
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: data?.message ?? "", links: links.length ? links : undefined },
        ]);
      } catch {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: t("assistant_error") },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [loading, sessionId, lang, t]
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
                  <div className="w-11 h-11 rounded-2xl overflow-hidden ring-2 ring-white/30 shadow-lg">
                    <AssistantAvatar size={44} className="w-full h-full" />
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
                        "disabled:opacity-50 disabled:pointer-events-none"
                      )}
                    >
                      <span className="w-8 h-8 rounded-xl flex items-center justify-center bg-brand-50 dark:bg-brand-900/40">
                        <Icon className="w-4 h-4 text-brand-600 dark:text-brand-300" />
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
                  <div className="w-8 h-8 rounded-xl overflow-hidden flex-shrink-0 mt-0.5 ring-1 ring-brand-100">
                    <AssistantAvatar size={32} className="w-full h-full" />
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
                  {msg.role === "assistant" && msg.links && msg.links.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-gray-100/80 dark:border-white/10">
                      {msg.links.map((link) => (
                        <Link
                          key={link.url}
                          href={link.url}
                          onClick={() => setOpen(false)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 transition-colors"
                        >
                          {lang === "bn" && link.label_bn ? link.label_bn : link.label}
                          <ExternalLink className="w-3 h-3 opacity-70" />
                        </Link>
                      ))}
                    </div>
                  )}
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

      <div className={cn(
        "fixed bottom-mobile-float right-4 lg:bottom-6 lg:right-6 z-50 transition-all duration-300",
        footerNear && !open && "opacity-0 pointer-events-none translate-y-4"
      )}>
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
            "relative w-14 h-14 rounded-full flex items-center justify-center transition-all duration-300 overflow-hidden",
            "ring-2 ring-brand-400/40 shadow-lg shadow-brand-500/30",
            open ? "scale-95" : "hover:scale-110",
            !open && "assistant-fab-ring"
          )}
          aria-label={open ? "Close assistant" : "Open assistant"}
          aria-expanded={open}
        >
          {open ? (
            <X className="w-6 h-6 text-white absolute z-10 bg-brand-600/90 rounded-full p-0.5" />
          ) : (
            <AssistantAvatar size={56} className="w-full h-full rounded-full" />
          )}
        </button>
      </div>
    </>
  );
}
