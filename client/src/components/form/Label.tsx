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
        "text-xs mb-1 block text-text-body-high font-semibold select-none",
        props.className,
      )}
      {...props}
    >
      {props.children}
    </label>
  );
}
