import type React from "react";
import type { JSX, MouseEvent, ReactElement, ReactNode } from "react";
import { twMerge } from "tailwind-merge";

type ButtonProps = {
  onClick?: (e: MouseEvent) => void;
  children: ReactNode;
  type?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
  disabled?: boolean;
  color: keyof (typeof VARIANTS)["color"]["filled"];
  variant?: keyof (typeof VARIANTS)["color"];
  leftIcon?: JSX.Element;
  rightIcon?: JSX.Element;
};

const VARIANTS = {
  color: {
    filled: {
      secondary: "bg-secondary-main text-on-secondary",
      primary: "bg-primary-main text-on-primary",
      success: "bg-success-main text-on-success",
      error: "bg-error-main text-on-error",
    },
    outline: {
      secondary:
        "border border-secondary-main text-secondary-main hover:bg-surface-hover",
      primary:
        "border border-primary-main text-primary-main hover:bg-surface-hover",
      success:
        "border bg-success-main text-success-main hover:bg-surface-hover",
      error: "border bg-error-main text-error-main hover:bg-surface-hover",
    },
    ghost: {
      secondary: "text-secondary-main hover:bg-surface-hover",
      primary: "text-primary-main hover:bg-surface-hover",
      success: "text-success-main hover:bg-surface-hover",
      error: "text-error-main hover:bg-surface-hover",
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
}: ButtonProps) {
  return (
    <button
      disabled={disabled}
      type={type}
      className={twMerge(
        "cursor-pointer min-h-10 px-8 gap-2 flex items-center justify-center font-bold rounded-lg hover:brightness-85 dark:brightness-115 transition-colors duration-fast",
        VARIANTS["color"][variant][color],
        leftIcon !== undefined ? "pl-4" : "",
        rightIcon !== undefined ? "pr-4" : "",
        disabled === undefined || disabled === false
          ? ""
          : "brightness-125 dark:brightness-75 pointer-events-none",
      )}
      onClick={onClick}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
