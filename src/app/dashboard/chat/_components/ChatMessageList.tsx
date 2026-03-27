import { RefObject } from "react";
import { Sparkles, CircleUser } from "lucide-react";
import { ChatMessage } from "../types";

interface ChatMessageListProps {
  messages: ChatMessage[];
  isLoading: boolean;
  bootstrapping: boolean;
  hasMoreMessages: boolean;
  loadingMore: boolean;
  activeChatId: string | null;
  loadMoreMessages: () => Promise<void>;
  messagesEndRef: RefObject<HTMLDivElement>;
  scrollContainerRef: RefObject<HTMLDivElement>;
}

export function ChatMessageList({
  messages,
  isLoading,
  bootstrapping,
  hasMoreMessages,
  loadingMore,
  activeChatId,
  loadMoreMessages,
  messagesEndRef,
  scrollContainerRef,
}: ChatMessageListProps) {
  return (
    <div
      ref={scrollContainerRef}
      className="flex-1 min-h-0 overflow-y-auto px-4 py-6 scroll-smooth"
      style={{ background: "var(--color-bg-panel)" }}
    >
      <div className="mx-auto flex w-full max-w-3xl flex-col gap-4">
        {hasMoreMessages && !bootstrapping && (
          <button
            onClick={() => void loadMoreMessages()}
            disabled={loadingMore}
            className="mx-auto rounded-lg border border-border bg-bg-card px-4 py-1.5 text-xs font-semibold text-text-muted hover:text-text-secondary hover:border-accent-primary/30 transition-all"
          >
            {loadingMore ? "Loading…" : "Load older messages"}
          </button>
        )}

        {bootstrapping ? (
          <div className="flex items-center justify-center py-24">
            <div className="h-7 w-7 rounded-full border-2 border-accent-primary/30 border-t-accent-primary animate-spin" />
          </div>
        ) : messages.length <= 1 && !activeChatId ? (
          <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in relative">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-56 bg-accent-primary/5 rounded-full blur-[80px] pointer-events-none" />
            <div className="relative mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-primary/25 bg-accent-primary/10 text-accent-primary shadow-[0_0_30px_rgba(139,92,246,0.15)]">
              <Sparkles className="h-7 w-7" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-white">Your Digital Twin is here.</h2>
            <p className="mt-2 max-w-xs text-sm text-text-secondary leading-relaxed">
              I know your patterns, moods, and goals. Ask me anything about your journey.
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={[
                "flex gap-3 group animate-fade-in",
                message.sender === "user" ? "flex-row-reverse" : "flex-row",
              ].join(" ")}
            >
              {/* Avatar */}
              <div
                className={[
                  "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-transform duration-200 group-hover:scale-105",
                  message.sender === "ai"
                    ? "bg-accent-primary border-accent-primary/60 shadow-[0_0_12px_rgba(139,92,246,0.35)]"
                    : "bg-bg-card border-border/70 shadow-sm",
                ].join(" ")}
              >
                {message.sender === "ai" ? (
                  <Sparkles className="h-3.5 w-3.5 text-white" />
                ) : (
                  <CircleUser className="h-3.5 w-3.5 text-text-secondary" />
                )}
              </div>

              {/* Bubble */}
              <div className={`flex max-w-[78%] flex-col ${message.sender === "user" ? "items-end" : "items-start"}`}>
                <div className="flex items-baseline gap-2 mb-1.5 px-1">
                  <span className="text-[12px] font-semibold text-text-secondary">
                    {message.sender === "ai" ? "Digital Twin" : "You"}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
                <div
                  className={[
                    "rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                    message.sender === "user"
                      ? "bg-accent-primary text-white rounded-tr-sm shadow-[0_2px_8px_rgba(139,92,246,0.3)]"
                      : "bg-bg-card border border-border/60 text-text-primary rounded-tl-sm shadow-sm",
                  ].join(" ")}
                >
                  {message.text}
                </div>
              </div>
            </div>
          ))
        )}

        {/* Typing indicator */}
        {isLoading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border bg-accent-primary border-accent-primary/60 shadow-[0_0_12px_rgba(139,92,246,0.35)]">
              <Sparkles className="h-3.5 w-3.5 text-white" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[12px] font-semibold text-text-secondary mb-1.5 px-1">Digital Twin</span>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-bg-card border border-border/60 px-4 py-3 shadow-sm">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-primary dot-bounce-1" />
                <span className="h-1.5 w-1.5 rounded-full bg-accent-primary dot-bounce-2" />
                <span className="h-1.5 w-1.5 rounded-full bg-accent-primary dot-bounce-3" />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>
    </div>
  );
}
