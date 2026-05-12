import type { ReactNode, SubmitEvent } from "react";
import { twMerge } from "tailwind-merge";

type FormProps = {
  children: ReactNode;
  onSubmit: (e: SubmitEvent<HTMLFormElement>) => void;
  className?: string;
};

export default function Form({ onSubmit, children, className }: FormProps) {
  return (
    <form
      className={twMerge(
        "bg-surface-high flex flex-col px-8 py-4 rounded-2xl h-full max-h-125 w-full max-w-sm overflow-y-auto",
        className,
      )}
      onSubmit={onSubmit}
    >
      {children}
    </form>
  );
}
