import { Loader2 } from "lucide-react";

export type SpinnerSize = "sm" | "md" | "lg" | "xl";

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
}

const sizeMap: Record<SpinnerSize, number> = {
  sm: 16,
  md: 20,
  lg: 28,
  xl: 36,
};

export default function Spinner({ size = "md", className = "" }: SpinnerProps) {
  return (
    <Loader2
      size={sizeMap[size]}
      className={["animate-spin text-accent-primary", className].join(" ")}
    />
  );
}
