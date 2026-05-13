import React, { type ReactNode } from "react";
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
        "h-6 px-1 inline-flex items-center text-link-main font-bold hover:underline cursor-pointer focus:underline text-sm font-headings",
        props.className,
      )}
    >
      {props.children}
    </Link>
  );
}
