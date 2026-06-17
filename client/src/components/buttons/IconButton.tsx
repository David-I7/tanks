import type React from "react";
import type { MouseEvent, ReactNode } from "react";

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
      className={`cursor-pointer h-10 w-10 grid place-content-center rounded-lg border border-accent/40 text-accent bg-surface-main/80 hover:bg-accent/15 hover:border-accent hover:text-accent hover:shadow-[0_0_10px_rgba(0,240,255,0.4)] transition-all duration-normal active:scale-95 ${className}`}
      onClick={onClick}
    >
      {icon || children}
    </button>
  );
}
