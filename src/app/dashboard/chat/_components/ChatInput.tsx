import { Dispatch, SetStateAction, useRef, useEffect } from "react";
import { Send } from "lucide-react";
import { quickPrompts } from "../constants";

interface ChatInputProps {
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  isLoading: boolean;
  bootstrapping: boolean;
  messagesCount: number;
  handleSend: () => Promise<void>;
}

export function ChatInput({
  input,
  setInput,
  isLoading,
  bootstrapping,
  messagesCount,
  handleSend,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 140)}px`;
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const canSend = !!input.trim() && !isLoading && !bootstrapping;

  return (
    <div className="border-t border-border/50 bg-bg-panel px-4 pb-5 pt-3">
      <div className="mx-auto w-full max-w-3xl">
        {/* Quick Prompt Chips */}
        {messagesCount < 3 && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-0.5 scrollbar-hide">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInput(prompt)}
                className="whitespace-nowrap rounded-full border border-border bg-bg-card/80 px-3 py-1.5 text-xs font-medium text-text-secondary hover:border-accent-primary/40 hover:text-accent-primary hover:bg-accent-primary/5 transition-all"
              >
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input Row */}
        <div className="flex items-end gap-3">
          <div className={[
            "relative flex-1 rounded-xl border bg-bg-card transition-all duration-200",
            input ? "border-accent-primary/40 shadow-[0_0_0_3px_rgba(139,92,246,0.08)]" : "border-border focus-within:border-accent-primary/40 focus-within:shadow-[0_0_0_3px_rgba(139,92,246,0.08)]",
          ].join(" ")}>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your digital twin anything…"
              rows={1}
              className="block w-full resize-none bg-transparent px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none max-h-[140px] leading-relaxed"
            />
          </div>

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={!canSend}
            className={[
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all duration-200",
              canSend
                ? "bg-accent-primary text-white shadow-lg shadow-accent-primary/30 hover:bg-accent-hover hover:scale-105 active:scale-95"
                : "bg-bg-card border border-border text-text-muted cursor-not-allowed",
            ].join(" ")}
          >
            <Send className="h-4 w-4" />
          </button>
        </div>

        <p className="mt-2 text-center text-[10px] text-text-muted/50">
          Press Enter to send · Shift+Enter for new line
        </p>
      </div>
    </div>
  );
}
