import type { ReactNode, SubmitEvent } from "react";

type FormProps = {
  children: ReactNode;
  onSubmit: (e: SubmitEvent) => void;
};

export default function Form({ onSubmit, children }: FormProps) {
  return (
    <form
      className="bg-surface-high grid-cols-1 grid-rows-1 px-8 py-4 rounded-2xl h-full max-h-100 w-full max-w-sm overflow-y-auto"
      onSubmit={onSubmit}
    >
      {children}
    </form>
  );
}
