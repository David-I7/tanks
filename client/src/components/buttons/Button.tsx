import type React from "react";
import type { JSX, MouseEvent, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

export type ButtonProps = {
  onClick?: (e: MouseEvent) => void;
  children: ReactNode;
  type?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
  disabled?: boolean;
  color: keyof (typeof VARIANTS)["color"]["filled"];
  variant?: keyof (typeof VARIANTS)["color"];
  leftIcon?: JSX.Element;
  rightIcon?: JSX.Element;
  className?: string;
};

const VARIANTS = {
  color: {
    filled: {
      secondary: "bg-accent text-on-accent hover:bg-accent-hover hover:shadow-[0_0_15px_rgba(0,240,255,0.5)] border-b-2 border-r-2 border-transparent active:border-b-0 active:border-r-0",
      primary: "bg-primary text-on-primary hover:bg-primary-hover hover:shadow-[0_0_15px_rgba(235,200,14,0.5)] border-b-2 border-r-2 border-transparent active:border-b-0 active:border-r-0",
      success: "bg-success text-on-success hover:shadow-[0_0_15px_rgba(57,255,20,0.5)] border-b-2 border-r-2 border-transparent active:border-b-0 active:border-r-0",
      error: "bg-error text-on-error hover:shadow-[0_0_15px_rgba(255,49,49,0.5)] border-b-2 border-r-2 border-transparent active:border-b-0 active:border-r-0",
    },
    outline: {
      secondary: "border-2 border-accent text-accent hover:bg-accent/10 hover:shadow-[0_0_10px_rgba(0,240,255,0.3)]",
      primary: "border-2 border-primary text-primary hover:bg-primary/10 hover:shadow-[0_0_10px_rgba(235,200,14,0.3)]",
      success: "border-2 border-success text-success hover:bg-success/10 hover:shadow-[0_0_10px_rgba(57,255,20,0.3)]",
      error: "border-2 border-error text-error hover:bg-error/10 hover:shadow-[0_0_10px_rgba(255,49,49,0.3)]",
    },
    ghost: {
      secondary: "text-accent hover:bg-accent/10",
      primary: "text-primary hover:bg-primary/10",
      success: "text-success hover:bg-success/10",
      error: "text-error hover:bg-error/10",
    },
  },
};

export default function Button({
  children,
  onClick,
  type = "button",
  disabled,
  color,
  variant = "filled",
  leftIcon,
  rightIcon,
  className = "",
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      type={type}
      className={twMerge(
        "cursor-pointer min-h-11 px-8 gap-2 flex items-center justify-center font-black rounded-lg transition-all duration-normal font-headings text-xs tracking-widest uppercase select-none active:translate-x-[1px] active:translate-y-[1px]",
        VARIANTS["color"][variant][color],
        leftIcon !== undefined ? "pl-4" : "",
        rightIcon !== undefined ? "pr-4" : "",
        disabled === undefined || disabled === false
          ? "opacity-100"
          : "opacity-40 cursor-not-allowed pointer-events-none",
        className,
      )}
      onClick={onClick}
    >
      {leftIcon && <span className="flex items-center justify-center">{leftIcon}</span>}
      <span>{children}</span>
      {rightIcon && <span className="flex items-center justify-center">{rightIcon}</span>}
    </button>
  );
}
