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
    <div className="mx-auto flex h-[calc(100vh-5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-border bg-bg-panel shadow-2xl animate-fade-in relative z-10">
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
        <div className="bg-status-error/10 px-6 py-2.5 text-center text-xs font-medium text-status-error border-b border-status-error/20 animate-fade-in">
          {errorMessage}
        </div>
      )}

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
    </div>
  );
}
