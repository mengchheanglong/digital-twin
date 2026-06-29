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
    <header className="relative z-20 flex shrink-0 items-center justify-between gap-2 border-b border-border bg-bg-panel/80 px-3 py-2.5 backdrop-blur-md sm:gap-3 sm:px-5 sm:py-3">
      {/* Companion Identity */}
      <div className="min-w-0 flex items-center gap-2 sm:gap-3">
        <div className="relative shrink-0">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-accent-primary to-accent-hover shadow-glow-soft border border-accent-primary/30">
            <Brain className="h-4 w-4 text-text-inverse" />
          </div>
          <div className="absolute inset-0 rounded-full bg-accent-primary/20 animate-[twinAuraPulse_3s_ease-in-out_infinite]" />
        </div>
        <div className="flex min-w-0 items-center">
          <h1 className="truncate text-sm font-bold text-text-primary leading-tight">
            Digital Twin
          </h1>
        </div>
      </div>

      {/* Actions */}
      <div ref={historyPanelRef} className="relative flex shrink-0 items-center gap-1">
        <Button
          variant="ghost"
          size="sm"
          leftIcon={<Plus className="h-4 w-4" />}
          onClick={() => startNewSession()}
          title="New Chat"
        >
          <span className="hidden min-[380px]:inline">New</span>
        </Button>

        <Button
          variant={historyPanelOpen ? "secondary" : "ghost"}
          size="sm"
          leftIcon={<History className="h-4 w-4" />}
          onClick={() => setHistoryPanelOpen((v) => !v)}
          title="Chat History"
        >
          <span className="hidden min-[380px]:inline">History</span>
        </Button>

        {historyPanelOpen && (
          <div className="absolute right-0 top-[calc(100%+0.5rem)] z-30 flex max-h-[min(70vh,28rem)] w-[calc(100vw-2rem)] max-w-80 origin-top-right animate-scale-in flex-col overflow-hidden rounded-xl border border-border bg-bg-card shadow-elevated sm:w-80">
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
