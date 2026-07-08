import type { ReactNode } from "react";
import { twMerge } from "tailwind-merge";
import Surface from "../layouts/Surface";

type FormProps = {
  children: ReactNode;
  onSubmit: (e: any) => void;
  className?: string;
};

export default function Form({ onSubmit, children, className }: FormProps) {
  return (
    <Surface className={twMerge("w-full max-w-sm", className)}>
      <form className="flex h-full max-h-130 flex-col overflow-y-auto px-8 py-6" onSubmit={onSubmit}>
        {children}
      </form>
    </Surface>
  );
}
