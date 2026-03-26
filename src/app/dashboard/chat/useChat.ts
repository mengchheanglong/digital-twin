import { useCallback, useEffect, useRef, useState } from "react";
import axios from "axios";
import { useAuth } from "@/hooks/useAuth";
import { ChatMessage, ChatSummary, ServerMessage } from "./types";
import { ACTIVE_CHAT_STORAGE_KEY, introMessage } from "./constants";
import { toUiMessage } from "./utils";

export function useChat() {
  const { requireAuth, getAuthHeaders } = useAuth();

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [historyChats, setHistoryChats] = useState<ChatSummary[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [historyPanelOpen, setHistoryPanelOpen] = useState(false);
  const [historyLoadingId, setHistoryLoadingId] = useState<string | null>(null);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const historyPanelRef = useRef<HTMLDivElement>(null);
  const shouldScrollToBottomRef = useRef(true);

  const startNewSession = useCallback((clearInput = true) => {
    sessionStorage.removeItem(ACTIVE_CHAT_STORAGE_KEY);
    setActiveChatId(null);
    setMessages([introMessage]);
    if (clearInput) {
      setInput("");
    }
    setErrorMessage("");
    setHistoryPanelOpen(false);
  }, []);

  const fetchHistoryChats = useCallback(async (headers: Record<string, string>) => {
    const response = await axios.get("/api/chat/history", { headers });
    const rawChats = Array.isArray(response.data?.chats) ? (response.data.chats as ChatSummary[]) : [];
    setHistoryChats(rawChats);
    return rawChats;
  }, []);

  const loadConversationById = useCallback(async (chatId: string, headers: Record<string, string>) => {
    const response = await axios.get("/api/chat/history", {
      headers,
      params: { chatId },
    });

    const rawMessages = Array.isArray(response.data?.messages) ? (response.data.messages as ServerMessage[]) : [];
    const pagination = response.data?.pagination || {};

    setHasMoreMessages(!!pagination.hasMore);
    setNextCursor(pagination.nextCursor || null);

    const parsedMessages = rawMessages
      .map((message, index) => toUiMessage(message, `history-${index}`))
      .filter((message): message is ChatMessage => Boolean(message));

    setMessages(parsedMessages.length ? parsedMessages : [introMessage]);
    setActiveChatId(chatId);
    sessionStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, chatId);
    shouldScrollToBottomRef.current = true;
  }, []);

  const loadMoreMessages = useCallback(async () => {
    if (!nextCursor || loadingMore || !activeChatId) return;

    const headers = getAuthHeaders();
    if (!headers) return;

    setLoadingMore(true);
    try {
      const response = await axios.get("/api/chat/history", {
        headers,
        params: { chatId: activeChatId, cursor: nextCursor },
      });

      const rawMessages = Array.isArray(response.data?.messages) ? (response.data.messages as ServerMessage[]) : [];
      const pagination = response.data?.pagination || {};

      setHasMoreMessages(!!pagination.hasMore);
      setNextCursor(pagination.nextCursor || null);

      const parsedMessages = rawMessages
        .map((message, index) => toUiMessage(message, `history-more-${Date.now()}-${index}`))
        .filter((message): message is ChatMessage => Boolean(message));

      if (parsedMessages.length > 0) {
        shouldScrollToBottomRef.current = false;
        setMessages((prev) => [...parsedMessages, ...prev]);
      }
    } catch (error) {
      console.error("Failed to load more messages", error);
    } finally {
      setLoadingMore(false);
    }
  }, [activeChatId, getAuthHeaders, loadingMore, nextCursor]);

  const initializeChatPage = useCallback(async () => {
    const headers = requireAuth();
    if (!headers) return;

    try {
      await fetchHistoryChats(headers);

      const storedActiveChatId = sessionStorage.getItem(ACTIVE_CHAT_STORAGE_KEY);
      if (storedActiveChatId) {
        try {
          await loadConversationById(storedActiveChatId, headers);
        } catch {
          startNewSession(false);
        }
      } else {
        startNewSession(false);
      }
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        requireAuth();
        return;
      }

      startNewSession(false);
      setErrorMessage("Unable to load chat history right now.");
    } finally {
      setBootstrapping(false);
    }
  }, [requireAuth, fetchHistoryChats, loadConversationById, startNewSession]);

  const openHistoryChat = useCallback(async (chatId: string) => {
    const headers = requireAuth();
    if (!headers) return;

    setHistoryLoadingId(chatId);
    try {
      await loadConversationById(chatId, headers);
      setErrorMessage("");
      setHistoryPanelOpen(false);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        requireAuth();
        return;
      }

      setErrorMessage("Unable to open this conversation.");
    } finally {
      setHistoryLoadingId(null);
    }
  }, [requireAuth, loadConversationById]);

  const handleSend = useCallback(async () => {
    if (!input.trim() || isLoading) return;

    const headers = requireAuth();
    if (!headers) return;

    const outgoingText = input.trim();
    const userMessage: ChatMessage = {
      id: `${Date.now()}-user`,
      text: outgoingText,
      sender: "user",
      timestamp: new Date(),
    };

    setMessages((current) => [...current, userMessage]);
    setInput("");
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await axios.post(
        "/api/chat/send",
        { message: outgoingText, chatId: activeChatId },
        { headers },
      );

      const reply = String(response.data?.reply || "").trim();
      const resolvedChatId = String(response.data?.chatId || "").trim();
      if (!reply) {
        throw new Error("Empty AI response.");
      }

      if (resolvedChatId && resolvedChatId !== activeChatId) {
        setActiveChatId(resolvedChatId);
        sessionStorage.setItem(ACTIVE_CHAT_STORAGE_KEY, resolvedChatId);
      }

      const aiMessage: ChatMessage = {
        id: `${Date.now()}-ai`,
        text: reply,
        sender: "ai",
        timestamp: new Date(),
      };

      setMessages((current) => [...current, aiMessage]);
      await fetchHistoryChats(headers);
    } catch (error) {
      if (axios.isAxiosError(error) && error.response?.status === 401) {
        requireAuth();
        return;
      }

      const serverMessage =
        axios.isAxiosError(error) && typeof error.response?.data?.msg === "string"
          ? error.response.data.msg
          : "Message failed to send.";
      setErrorMessage(serverMessage);
    } finally {
      setIsLoading(false);
    }
  }, [activeChatId, requireAuth, fetchHistoryChats, input, isLoading]);

  useEffect(() => {
    void initializeChatPage();
  }, [initializeChatPage]);

  useEffect(() => {
    if (shouldScrollToBottomRef.current) {
      const container = scrollContainerRef.current;
      if (container) {
        container.scrollTo({ top: container.scrollHeight, behavior: "smooth" });
      }
    } else {
      shouldScrollToBottomRef.current = true;
    }
  }, [messages, isLoading]);

  useEffect(() => {
    if (!historyPanelOpen) return;

    const handleOutsideClick = (event: MouseEvent) => {
      if (!historyPanelRef.current) return;
      if (!historyPanelRef.current.contains(event.target as Node)) {
        setHistoryPanelOpen(false);
      }
    };

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [historyPanelOpen]);

  return {
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
  };
}
