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
        "text-text-headings font-bold text-4xl select-none",
        className,
      )}
    >
      {children}
    </h1>
  );
}
