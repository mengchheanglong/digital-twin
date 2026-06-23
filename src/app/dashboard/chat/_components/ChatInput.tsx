import { Dispatch, SetStateAction, useRef, useEffect } from "react";
import {
  ArrowUp,
  Zap,
  Heart,
  Target,
  Lightbulb,
  Sparkles,
} from "lucide-react";
import { quickPrompts } from "../constants";
import { Button } from "@/components/ui";

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
    <div className="border-t border-border bg-bg-panel px-4 pb-5 pt-3 z-20 shrink-0">
      <div className="mx-auto w-full max-w-3xl">
        {/* Quick Prompt Chips */}
        {messagesCount < 3 && !bootstrapping && (
          <div className="flex gap-2 mb-3 overflow-x-auto pb-1 scrollbar-hide">
            {quickPrompts.map((prompt) => (
              <button
                key={prompt}
                type="button"
                onClick={() => setInput(prompt)}
                className={[
                  "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-medium transition-all duration-200 ease-apple",
                  "border-border bg-bg-card text-text-secondary",
                  "hover:border-accent-primary/40 hover:text-accent-primary hover:bg-accent-subtle hover:shadow-glow-soft",
                ].join(" ")}
              >
                {promptIcons[prompt] ?? <Zap className="h-3 w-3" />}
                {prompt}
              </button>
            ))}
          </div>
        )}

        {/* Input Row */}
        <div className="flex items-end gap-3">
          <div
            className={[
              "relative flex-1 rounded-2xl border bg-bg-card transition-all duration-200 ease-apple",
              input
                ? "border-accent-primary/50 shadow-[0_0_0_3px_var(--color-accent-subtle)]"
                : "border-border focus-within:border-accent-primary/50 focus-within:shadow-[0_0_0_3px_var(--color-accent-subtle)]",
            ].join(" ")}
          >
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask your Digital Twin anything..."
              rows={1}
              className="block w-full resize-none bg-transparent px-4 py-3 text-sm text-text-primary placeholder:text-text-muted outline-none max-h-[140px] leading-relaxed scrollbar-hide"
            />
          </div>

          <Button
            variant="primary"
            size="md"
            className="h-10 w-10 rounded-full p-0 shrink-0"
            onClick={() => void handleSend()}
            disabled={!canSend}
            leftIcon={<ArrowUp className="h-4 w-4" />}
          />
        </div>

        <p className="mt-2 text-center text-[10px] text-text-muted/60 font-medium tracking-wide">
          Press Enter to send · Shift + Enter for new line
        </p>
      </div>
    </div>
  );
}
