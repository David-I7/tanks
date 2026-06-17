import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type FormProps = {
  children: ReactNode;
  onSubmit: (e: any) => void;
  className?: string;
};

export default function Form({ onSubmit, children, className }: FormProps) {
  return (
    <form
      className={twMerge(
        "cyber-panel flex flex-col px-8 py-6 h-full max-h-130 w-full max-w-sm overflow-y-auto",
        className,
      )}
      onSubmit={onSubmit}
    >
      {children}
    </form>
  );
}
