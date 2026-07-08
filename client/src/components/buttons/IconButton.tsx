import type React from "react";
import type { MouseEvent, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type IconButtonProps = {
  onClick?: (e: MouseEvent) => void;
  icon?: ReactNode;
  children?: ReactNode;
  type?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
  className?: string;
};

export default function IconButton({
  icon,
  children,
  onClick,
  type = "button",
  className = "",
}: IconButtonProps) {
  return (
    <button
      type={type}
      className={twMerge(
        "cursor-pointer h-10 w-10 grid place-content-center rounded-lg border border-border-main text-text-body-high bg-surface-main hover:bg-surface-high transition-colors duration-normal active:scale-95",
        className,
      )}
      onClick={onClick}
    >
      {icon || children}
    </button>
  );
}
