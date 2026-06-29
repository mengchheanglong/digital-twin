import { RefObject } from "react";
import { Sparkles, CircleUser, ChevronUp } from "lucide-react";
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
      <div className="mx-auto flex min-h-full w-full max-w-3xl flex-col gap-4 px-3 py-4 sm:gap-5 sm:px-4 sm:py-6">
        {/* Load more */}
        {hasMoreMessages && !bootstrapping && (
          <div className="flex justify-center">
            <button
              onClick={() => void loadMoreMessages()}
              disabled={loadingMore}
              className="group inline-flex items-center gap-2 rounded-full border border-border bg-bg-card px-4 py-1.5 text-xs font-medium text-text-muted hover:text-text-secondary hover:border-border-hover hover:bg-bg-hover transition-all duration-200 ease-apple disabled:opacity-50"
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

        {/* Bootstrapping skeletons */}
        {bootstrapping ? (
          <div className="flex flex-col gap-5 animate-fade-in">
            <div className="flex gap-3">
              <Skeleton width={32} height={32} rounded="full" />
              <div className="flex flex-col gap-2 flex-1 max-w-[75%]">
                <Skeleton width="30%" height={12} rounded="md" />
                <Skeleton width="100%" height={60} rounded="xl" />
              </div>
            </div>
            <div className="flex gap-3 flex-row-reverse">
              <Skeleton width={32} height={32} rounded="full" />
              <div className="flex flex-col gap-2 flex-1 max-w-[75%] items-end">
                <Skeleton width="20%" height={12} rounded="md" />
                <Skeleton width="80%" height={40} rounded="xl" />
              </div>
            </div>
          </div>
        ) : isEmpty ? (
          /* Empty / Welcome state */
          <div className="flex min-h-full flex-1 flex-col items-center justify-center py-8 text-center animate-fade-in sm:py-16">
            <div className="relative mb-6">
              <div className="absolute inset-0 rounded-full bg-accent-primary/10 blur-2xl scale-150" />
              <div className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-accent-primary to-accent-hover border border-accent-primary/30 shadow-glow">
                <Sparkles className="h-7 w-7 text-text-inverse" />
              </div>
              <div className="absolute inset-0 rounded-2xl bg-accent-primary/20 animate-[twinAuraPulse_3s_ease-in-out_infinite]" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-text-primary">
              Your Digital Twin is here.
            </h2>
            <p className="mt-3 max-w-sm text-sm text-text-secondary leading-relaxed">
              {messages[0]?.text}
            </p>
          </div>
        ) : (
          /* Messages */
          messages.map((message) => (
            <div
              key={message.id}
              className={[
                "flex gap-3 animate-fade-in",
                message.sender === "user" ? "flex-row-reverse" : "flex-row",
              ].join(" ")}
            >
              {/* Avatar */}
              <div
                className={[
                  "mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border transition-all duration-200 ease-apple",
                  message.sender === "ai"
                    ? "bg-gradient-to-br from-accent-primary to-accent-hover border-accent-primary/40 shadow-glow-soft"
                    : "bg-bg-card border-border shadow-sm",
                ].join(" ")}
              >
                {message.sender === "ai" ? (
                  <Sparkles className="h-3.5 w-3.5 text-text-inverse" />
                ) : (
                  <CircleUser className="h-3.5 w-3.5 text-text-secondary" />
                )}
              </div>

              {/* Bubble + meta */}
              <div
                className={`flex min-w-0 max-w-[82%] flex-col sm:max-w-[80%] ${
                  message.sender === "user" ? "items-end" : "items-start"
                }`}
              >
                <div className="flex items-baseline gap-2 mb-1 px-1">
                  <span className="text-[11px] font-semibold text-text-secondary">
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
                      ? "bg-gradient-to-br from-accent-primary to-accent-hover text-text-inverse rounded-2xl rounded-tr-sm shadow-glow-soft"
                      : "bg-bg-card border border-border/70 text-text-primary rounded-2xl rounded-tl-sm shadow-sm",
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
            <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-hover border border-accent-primary/40 shadow-glow-soft">
              <Sparkles className="h-3.5 w-3.5 text-text-inverse" />
            </div>
            <div className="flex flex-col items-start">
              <span className="text-[11px] font-semibold text-text-secondary mb-1 px-1">
                Digital Twin
              </span>
              <div className="flex items-center gap-1.5 rounded-2xl rounded-tl-sm bg-bg-card border border-border/70 px-4 py-3 shadow-sm">
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
