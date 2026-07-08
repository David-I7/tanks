import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type SurfaceProps = {
  children: ReactNode;
  className?: string;
};

export default function Surface({ children, className }: SurfaceProps) {
  return (
    <div
      className={twMerge(
        "rounded-lg border border-border-main bg-surface-main/90 shadow-sm",
        className,
      )}
    >
      {children}
    </div>
  );
}
