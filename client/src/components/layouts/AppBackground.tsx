import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type AppBackgroundProps = {
  children: ReactNode;
  className?: string;
};

export default function AppBackground({ children, className }: AppBackgroundProps) {
  return (
    <main
      className={twMerge(
        "min-h-screen bg-background text-text-body font-body relative overflow-hidden",
        className,
      )}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_var(--color-background-high),_var(--color-background))]" />
      <div className="relative z-10 min-h-screen">{children}</div>
    </main>
  );
}
