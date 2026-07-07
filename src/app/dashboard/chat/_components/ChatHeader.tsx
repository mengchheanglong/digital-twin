import { Dispatch, RefObject, SetStateAction } from "react";
import { History, MessageSquarePlus, PanelRightClose, Sparkles, X } from "lucide-react";
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
    <header className="relative z-20 shrink-0 border-b border-border-subtle bg-bg-base/82 px-3 py-3 backdrop-blur-xl sm:px-6">
      <div className="flex w-full items-center justify-between gap-3">
        <div className="min-w-0 flex items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-accent-primary/25 bg-accent-subtle text-accent-primary shadow-glow-soft">
            <Sparkles className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <p className="font-mono text-[10px] font-black uppercase tracking-[0.22em] text-accent-primary">
              Companion
            </p>
            <h1 className="truncate text-sm font-black leading-tight tracking-tight text-text-primary sm:text-base">
              Digital Twin
            </h1>
          </div>
        </div>

        <div ref={historyPanelRef} className="relative flex shrink-0 items-center gap-1.5">
          <Button
            variant="ghost"
            size="sm"
            leftIcon={<MessageSquarePlus className="h-4 w-4" />}
            onClick={() => startNewSession()}
            title="New Chat"
            className="min-h-[40px] rounded-xl"
          >
            <span className="hidden min-[420px]:inline">New</span>
          </Button>

          <Button
            variant={historyPanelOpen ? "secondary" : "ghost"}
            size="sm"
            leftIcon={historyPanelOpen ? <PanelRightClose className="h-4 w-4" /> : <History className="h-4 w-4" />}
            onClick={() => setHistoryPanelOpen((v) => !v)}
            title="Chat History"
            className="min-h-[40px] rounded-xl"
          >
            <span className="hidden min-[420px]:inline">History</span>
          </Button>

          {historyPanelOpen && (
            <div className="absolute right-0 top-[calc(100%+0.75rem)] z-30 flex max-h-[min(72vh,30rem)] w-[calc(100vw-1.5rem)] max-w-96 origin-top-right animate-scale-in flex-col overflow-hidden rounded-2xl border border-border bg-bg-card shadow-elevated sm:w-96">
              <div className="flex items-center justify-between border-b border-border bg-bg-panel/70 px-4 py-3">
                <div>
                  <p className="font-mono text-[10px] font-black uppercase tracking-[0.18em] text-text-muted">
                    Memory
                  </p>
                  <h3 className="text-sm font-black text-text-primary">
                    Recent conversations
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setHistoryPanelOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-xl text-text-muted transition-colors hover:bg-bg-hover hover:text-text-primary focus-ring"
                  aria-label="Close chat history"
                >
                  <X className="h-4 w-4" />
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
      </div>
    </header>
  );
}
