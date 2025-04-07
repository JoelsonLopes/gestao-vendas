import { cn } from "@/lib/utils";
import { Loader2 } from "lucide-react";
import { HTMLAttributes } from "react";

interface SpinnerProps extends HTMLAttributes<HTMLDivElement> {
  size?: "sm" | "md" | "lg";
}

export function Spinner({ size = "md", className, ...props }: SpinnerProps) {
  const sizeClass = {
    sm: "h-4 w-4",
    md: "h-6 w-6",
    lg: "h-8 w-8",
  };

  return (
    <div className={className} {...props}>
      <Loader2
        className={cn(`animate-spin text-muted-foreground`, sizeClass[size])}
      />
    </div>
  );
}