import React from "react";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  width?: string | number;
  height?: string | number;
  rounded?: "sm" | "md" | "lg" | "xl" | "full" | "none";
}

const roundedMap = {
  sm: "rounded-sm",
  md: "rounded-md",
  lg: "rounded-lg",
  xl: "rounded-xl",
  full: "rounded-full",
  none: "rounded-none",
};

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ width = "100%", height = "1rem", rounded = "md", className = "", style, ...props }, ref) => {
    const widthValue = typeof width === "number" ? `${width}px` : width;
    const heightValue = typeof height === "number" ? `${height}px` : height;

    return (
      <div
        ref={ref}
        className={[
          "animate-shimmer bg-surface-200",
          roundedMap[rounded],
          className,
        ].join(" ")}
        style={{
          width: widthValue,
          height: heightValue,
          ...style,
        }}
        {...props}
      />
    );
  }
);

Skeleton.displayName = "Skeleton";

export default Skeleton;
