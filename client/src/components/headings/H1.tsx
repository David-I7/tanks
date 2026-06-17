import { type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type H1Props = {
  children: ReactNode;
  className?: string;
};

export default function H1({ children, className }: H1Props) {
  return (
    <h1
      className={twMerge(
        "text-text-headings font-bold font-headings text-4xl tracking-wider text-neon-cyan select-none uppercase",
        className,
      )}
    >
      {children}
    </h1>
  );
}
