import type { ReactNode } from "react";
import type React from "react";
import { twMerge } from "tailwind-merge";

type LabelProps = React.DetailedHTMLProps<
  React.LabelHTMLAttributes<HTMLLabelElement>,
  HTMLLabelElement
> & {
  children: ReactNode;
};

export default function Label(props: LabelProps) {
  return (
    <label
      className={twMerge(
        "text-xs mb-1 block text-accent uppercase tracking-widest font-body font-bold select-none",
        props.className,
      )}
      {...props}
    >
      <span className="text-primary mr-1">::</span> {props.children}
    </label>
  );
}
