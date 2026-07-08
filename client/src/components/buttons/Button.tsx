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
      secondary: "bg-secondary text-on-secondary hover:bg-secondary-hover",
      primary: "bg-primary text-on-primary hover:bg-primary-hover",
      success: "bg-success text-on-success hover:bg-success-hover",
      error: "bg-error text-on-error hover:bg-error-hover",
    },
    outline: {
      secondary: "border border-secondary text-secondary hover:bg-secondary/10",
      primary: "border border-primary text-primary hover:bg-primary/10",
      success: "border border-success text-success hover:bg-success/10",
      error: "border border-error text-error hover:bg-error/10",
    },
    ghost: {
      secondary: "text-secondary hover:bg-secondary/10",
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
        "cursor-pointer min-h-10 px-6 gap-2 flex items-center justify-center font-semibold rounded-lg transition-colors duration-normal text-sm select-none active:translate-y-px",
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
