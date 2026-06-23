import { ChatSummary } from "../types";
import { MessageSquare, Clock } from "lucide-react";
import { Badge, Spinner } from "@/components/ui";

interface ChatHistoryListProps {
  historyChats: ChatSummary[];
  activeChatId: string | null;
  historyLoadingId: string | null;
  openHistoryChat: (chatId: string) => void;
}

export function ChatHistoryList({
  historyChats,
  activeChatId,
  historyLoadingId,
  openHistoryChat,
}: ChatHistoryListProps) {
  if (!historyChats.length) {
    return (
      <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
        <MessageSquare className="h-8 w-8 text-text-muted mb-2" />
        <p className="text-sm text-text-muted">No conversations yet.</p>
        <p className="text-xs text-text-muted/70 mt-1">
          Your chats will appear here.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {historyChats.map((chat) => (
        <button
          key={chat.id}
          type="button"
          onClick={() => {
            void openHistoryChat(chat.id);
          }}
          disabled={historyLoadingId === chat.id}
          className={[
            "group w-full rounded-lg px-3 py-2.5 text-left transition-all duration-200 ease-apple",
            chat.id === activeChatId
              ? "bg-accent-subtle border border-accent-primary/20 shadow-glow-soft"
              : "hover:bg-bg-hover border border-transparent",
            historyLoadingId === chat.id ? "opacity-60 cursor-wait" : "",
          ].join(" ")}
        >
          <div className="flex items-start justify-between gap-2">
            <p className="truncate text-sm font-semibold text-text-primary flex-1">
              {chat.title}
            </p>
            {historyLoadingId === chat.id ? (
              <Spinner size="sm" />
            ) : chat.id === activeChatId ? (
              <span className="mt-0.5 h-2 w-2 rounded-full bg-accent-primary shadow-glow-soft shrink-0" />
            ) : null}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs text-text-secondary leading-relaxed">
            {chat.preview}
          </p>
          <div className="mt-2 flex items-center gap-2 text-[10px] text-text-muted">
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {new Date(chat.updatedAt).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </span>
            <Badge tone="default" className="text-[10px] px-1.5 py-0">
              {chat.messageCount}
            </Badge>
          </div>
        </button>
      ))}
    </div>
  );
}
