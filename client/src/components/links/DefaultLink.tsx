import { type ReactNode } from "react";
import { Link, type LinkProps } from "react-router-dom";
import { twMerge } from "tailwind-merge";

type DefaultLinkProps = LinkProps & {
  children: ReactNode;
};

export default function DefaultLink(props: DefaultLinkProps) {
  return (
    <Link
      {...props}
      className={twMerge(
        "h-6 px-1 inline-flex items-center text-accent hover:text-accent-hover font-bold cursor-pointer hover:underline text-sm font-headings tracking-wider transition-all duration-normal",
        props.className,
      )}
    >
      {props.children}
    </Link>
  );
}
