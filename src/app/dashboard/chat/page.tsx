"use client";

import { useChat } from "./useChat";
import { ChatHeader } from "./_components/ChatHeader";
import { ChatMessageList } from "./_components/ChatMessageList";
import { ChatInput } from "./_components/ChatInput";

export default function CompanionPage() {
  const {
    messages,
    historyChats,
    activeChatId,
    historyPanelOpen,
    setHistoryPanelOpen,
    historyLoadingId,
    input,
    setInput,
    isLoading,
    bootstrapping,
    errorMessage,
    hasMoreMessages,
    loadingMore,
    messagesEndRef,
    scrollContainerRef,
    historyPanelRef,
    startNewSession,
    openHistoryChat,
    loadMoreMessages,
    handleSend,
  } = useChat();

  return (
    <div className="fixed inset-x-0 bottom-[calc(var(--mobile-nav-height)+env(safe-area-inset-bottom))] top-0 z-10 flex min-h-0 flex-col overflow-hidden bg-[radial-gradient(circle_at_50%_-12%,rgba(124,92,252,0.18),transparent_32%),linear-gradient(180deg,rgba(255,255,255,0.025),transparent_28%),var(--color-bg-base)] animate-fade-in md:relative md:inset-auto md:h-screen md:w-full">
      <section className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.016)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.016)_1px,transparent_1px)] bg-[size:36px_36px] opacity-50" />

        <ChatHeader
          historyPanelRef={historyPanelRef}
          historyPanelOpen={historyPanelOpen}
          setHistoryPanelOpen={setHistoryPanelOpen}
          startNewSession={startNewSession}
          historyChats={historyChats}
          activeChatId={activeChatId}
          historyLoadingId={historyLoadingId}
          openHistoryChat={openHistoryChat}
        />

        {errorMessage && (
          <div className="relative z-10 shrink-0 border-y border-status-error/20 bg-status-error/10 px-6 py-2.5 text-center text-xs font-medium text-status-error animate-fade-in">
            {errorMessage}
          </div>
        )}

        <main className="relative z-10 flex min-h-0 flex-1 flex-col">
          <ChatMessageList
            messages={messages}
            isLoading={isLoading}
            bootstrapping={bootstrapping}
            hasMoreMessages={hasMoreMessages}
            loadingMore={loadingMore}
            activeChatId={activeChatId}
            loadMoreMessages={loadMoreMessages}
            messagesEndRef={messagesEndRef}
            scrollContainerRef={scrollContainerRef}
          />

          <ChatInput
            input={input}
            setInput={setInput}
            isLoading={isLoading}
            bootstrapping={bootstrapping}
            messagesCount={messages.length}
            handleSend={handleSend}
          />
        </main>
      </section>
    </div>
  );
}
