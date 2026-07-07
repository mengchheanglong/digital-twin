import { RefObject } from "react";
import { ChevronUp, CircleUser, Sparkles } from "lucide-react";
import { ChatMessage } from "../types";
import { Skeleton, Spinner } from "@/components/ui";

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
  const isEmpty = messages.length <= 1 && !activeChatId;

  return (
    <div
      ref={scrollContainerRef}
      className="min-h-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-contain scroll-smooth [-webkit-overflow-scrolling:touch]"
    >
      <div className="flex min-h-full w-full flex-col gap-4 px-4 py-5 sm:gap-5 sm:px-8 sm:py-8">
        {hasMoreMessages && !bootstrapping && (
          <div className="flex justify-center">
            <button
              onClick={() => void loadMoreMessages()}
              disabled={loadingMore}
              className="group inline-flex min-h-[40px] items-center gap-2 rounded-full border border-border bg-bg-card px-4 py-2 text-xs font-semibold text-text-muted transition-all duration-200 ease-apple hover:border-border-hover hover:bg-bg-hover hover:text-text-secondary disabled:opacity-50"
            >
              {loadingMore ? (
                <Spinner size="sm" />
              ) : (
                <>
                  <ChevronUp className="h-3 w-3 transition-transform group-hover:-translate-y-0.5" />
                  Load earlier messages
                </>
              )}
            </button>
          </div>
        )}

        {bootstrapping ? (
          <div className="flex flex-col gap-5 animate-fade-in">
            <div className="flex gap-3">
              <Skeleton width={36} height={36} rounded="xl" />
              <div className="flex max-w-[75%] flex-1 flex-col gap-2">
                <Skeleton width="30%" height={12} rounded="md" />
                <Skeleton width="100%" height={72} rounded="xl" />
              </div>
            </div>
            <div className="flex flex-row-reverse gap-3">
              <Skeleton width={36} height={36} rounded="xl" />
              <div className="flex max-w-[75%] flex-1 flex-col items-end gap-2">
                <Skeleton width="20%" height={12} rounded="md" />
                <Skeleton width="80%" height={48} rounded="xl" />
              </div>
            </div>
          </div>
        ) : isEmpty ? (
          <div className="flex min-h-full flex-1 items-center justify-center px-2 py-8 text-center animate-fade-in sm:py-12">
            <section className="w-full max-w-3xl">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-accent-primary/25 bg-accent-subtle text-accent-primary shadow-glow-soft">
                <Sparkles className="h-6 w-6" />
              </div>
              <p className="mt-6 font-mono text-[10px] font-black uppercase tracking-[0.24em] text-accent-primary">
                Companion
              </p>
              <h2 className="mt-3 text-3xl font-black tracking-tight text-text-primary sm:text-5xl">
                What needs clarity today?
              </h2>
              <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
                {messages[0]?.text}
              </p>
            </section>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={[
                "flex gap-3 animate-fade-in",
                message.sender === "user" ? "flex-row-reverse" : "flex-row",
              ].join(" ")}
            >
              <div
                className={[
                  "mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border transition-all duration-200 ease-apple",
                  message.sender === "ai"
                    ? "border-accent-primary/40 bg-accent-subtle text-accent-primary shadow-glow-soft"
                    : "border-border bg-bg-card text-text-secondary shadow-sm",
                ].join(" ")}
              >
                {message.sender === "ai" ? (
                  <Sparkles className="h-4 w-4" />
                ) : (
                  <CircleUser className="h-4 w-4" />
                )}
              </div>

              <div
                className={`flex min-w-0 max-w-[84%] flex-col sm:max-w-[78%] ${
                  message.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div className="mb-1 flex items-baseline gap-2 px-1">
                  <span className="text-[11px] font-bold text-text-secondary">
                    {message.sender === "ai" ? "Digital Twin" : "You"}
                  </span>
                  <span className="text-[10px] text-text-muted">
                    {new Date(message.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <div
                  className={[
                    "px-3 py-2.5 text-sm leading-relaxed transition-all duration-200 break-words [overflow-wrap:anywhere] sm:px-4",
                    message.sender === "user"
                      ? "rounded-2xl rounded-tr-sm bg-accent-primary text-white shadow-glow-soft"
                      : "rounded-2xl rounded-tl-sm border border-border/70 bg-bg-card/90 text-text-primary shadow-sm",
                  ].join(" ")}
                >
                  {message.text}
                </div>
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex gap-3 animate-fade-in">
            <div className="mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-accent-primary/40 bg-accent-subtle text-accent-primary shadow-glow-soft">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex flex-col items-start">
              <span className="mb-1 px-1 text-[11px] font-bold text-text-secondary">
                Digital Twin
              </span>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm border border-border/70 bg-bg-card/90 px-4 py-3 shadow-sm">
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
