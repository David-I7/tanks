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
        "h-6 px-1 inline-flex items-center text-link hover:text-link-hover font-semibold cursor-pointer hover:underline text-sm transition-colors duration-normal",
        props.className,
      )}
    >
      {props.children}
    </Link>
  );
}
