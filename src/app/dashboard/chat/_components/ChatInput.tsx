import { Dispatch, SetStateAction, useEffect, useRef } from "react";
import { ArrowUp, Heart, Lightbulb, Sparkles, Target, Zap } from "lucide-react";
import { quickPrompts } from "../constants";

interface ChatInputProps {
  input: string;
  setInput: Dispatch<SetStateAction<string>>;
  isLoading: boolean;
  bootstrapping: boolean;
  messagesCount: number;
  handleSend: () => Promise<void>;
}

const promptIcons: Record<string, React.ReactNode> = {
  "How am I doing this week?": <Sparkles className="h-3 w-3" />,
  "Help me de-stress": <Heart className="h-3 w-3" />,
  "Build a new habit": <Target className="h-3 w-3" />,
  "Reflect on my mood": <Lightbulb className="h-3 w-3" />,
};

export function ChatInput({
  input,
  setInput,
  isLoading,
  bootstrapping,
  messagesCount,
  handleSend,
}: ChatInputProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 96)}px`;
  }, [input]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const canSend = !!input.trim() && !isLoading && !bootstrapping;

  return (
    <div className="z-20 shrink-0 overflow-hidden border-t border-border-subtle bg-bg-base/92 px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2.5 backdrop-blur-xl sm:px-6 sm:pb-4">
      <div className="mx-auto w-full max-w-2xl min-w-0">
        {messagesCount < 3 && !bootstrapping && (
          <div className="mb-2 flex flex-wrap gap-1.5 overflow-hidden">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInput(prompt)}
                className="inline-flex min-h-[30px] items-center gap-1.5 whitespace-nowrap rounded-full border border-border bg-bg-card/80 px-2.5 py-1 text-[11px] font-semibold text-text-secondary transition-all duration-200 ease-apple hover:border-accent-primary/40 hover:bg-accent-subtle hover:text-accent-primary"
              >
                {promptIcons[prompt] ?? <Zap className="h-3 w-3" />}
                {prompt}
              </button>
            ))}
          </div>
        )}

        <div className="rounded-2xl border border-border bg-bg-card/95 p-1.5 shadow-elevated transition-all focus-within:border-accent-primary/45 focus-within:shadow-glow-soft">
          <div className="flex items-end gap-1.5 sm:gap-2">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell your Twin what needs clarity…"
              rows={1}
              className="block max-h-24 min-h-9 min-w-0 flex-1 resize-none bg-transparent px-3 py-2 text-sm leading-5 text-text-primary outline-none placeholder:text-text-muted scrollbar-hide"
            />

            <button
              type="button"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-r from-accent-primary to-accent-hover text-white shadow-glow-soft transition-all duration-200 ease-apple hover:-translate-y-0.5 hover:shadow-glow active:translate-y-0 active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:shadow-none disabled:hover:translate-y-0"
              onClick={() => void handleSend()}
              disabled={!canSend}
              title="Send message"
            >
              <ArrowUp className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
