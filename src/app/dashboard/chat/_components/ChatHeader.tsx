import { Dispatch, RefObject, SetStateAction } from "react";
import { Plus, History, Brain, X } from "lucide-react";
import { ChatSummary } from "../types";
import { ChatHistoryList } from "./ChatHistoryList";
import { Button } from "@/components/ui";

interface ChatHeaderProps {
  historyPanelRef: RefObject<HTMLDivElement>;
  historyPanelOpen: boolean;
  setHistoryPanelOpen: Dispatch<SetStateAction<boolean>>;
  startNewSession: () => void;
  historyChats: ChatSummary[];
  activeChatId: string | null;
  historyLoadingId: string | null;
  openHistoryChat: (chatId: string) => Promise<void>;
}

export function ChatHeader({
  historyPanelRef,
  historyPanelOpen,
  setHistoryPanelOpen,
  startNewSession,
  historyChats,
  activeChatId,
  historyLoadingId,
  openHistoryChat,
}: ChatHeaderProps) {
  return (
    <header className="relative flex items-center justify-between gap-3 border-b border-border bg-bg-panel/80 backdrop-blur-md px-4 sm:px-5 py-3 z-20 shrink-0">
      {/* Companion Identity */}
      <div className="flex items-center gap-3">
        <div className="relative">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-hover shadow-glow-soft border border-accent-primary/30">
            <Brain className="h-4 w-4 text-text-inverse" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-status-success border-2 border-bg-panel shadow-sm" />
          <div className="absolute inset-0 rounded-full bg-accent-primary/20 animate-[twinAuraPulse_3s_ease-in-out_infinite]" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-text-primary leading-tight">
            Digital Twin
          </h1>
          <p className="text-[11px] font-medium text-status-success leading-tight flex items-center gap-1">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-status-success opacity-75" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-status-success" />
            </span>
            Online
          </p>
        </div>
      </div>

      {/* Actions */}
      <div ref={historyPanelRef} className="relative flex items-center gap-1.5">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => startNewSession()}
          title="New Chat"
        >
          New
        </Button>

        <Button
          variant={historyPanelOpen ? "secondary" : "ghost"}
          size="sm"
          leftIcon={<History className="h-4 w-4" />}
          onClick={() => setHistoryPanelOpen((v) => !v)}
          title="Chat History"
        >
          History
        </Button>

        {historyPanelOpen && (
          <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 w-80 max-w-[85vw] max-h-[min(70vh,28rem)] overflow-hidden rounded-xl border border-border bg-bg-card shadow-elevated animate-scale-in origin-top-right flex flex-col">
            <div className="flex items-center justify-between border-b border-border px-4 py-3 bg-bg-panel/50">
              <h3 className="text-sm font-semibold text-text-primary">
                Recent Conversations
              </h3>
              <button
                type="button"
                onClick={() => setHistoryPanelOpen(false)}
                className="flex h-6 w-6 items-center justify-center rounded-md text-text-muted hover:bg-bg-hover hover:text-text-primary transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="overflow-y-auto p-2 scrollbar-hide">
              <ChatHistoryList
                historyChats={historyChats}
                activeChatId={activeChatId}
                historyLoadingId={historyLoadingId}
                openHistoryChat={openHistoryChat}
              />
            </div>
          </div>
        )}
      </div>
    </header>
  );
}
