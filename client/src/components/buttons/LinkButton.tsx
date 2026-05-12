import React, { type ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type LinkButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  children: ReactNode;
};

export default function LinkButton(props: LinkButtonProps) {
  return (
    <button
      type="button"
      {...props}
      className={twMerge(
        "h-6 px-1 inline-flex items-center text-link-main font-bold hover:underline cursor-pointer focus:underline text-sm font-headings",
        props.className,
      )}
    ></button>
  );
}
