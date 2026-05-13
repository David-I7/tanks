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
      secondary: "border border-secondary-main text-secondary-main",
      primary: "border border-primary-main text-primary-main",
      success: "border border-success-main text-success-main",
      error: "border border-error-main text-error-main",
    },
    ghost: {
      secondary: "text-secondary-main",
      primary: "text-primary-main",
      success: "text-success-main",
      error: "text-error-main",
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
        "cursor-pointer min-h-10 px-8 gap-2 flex items-center justify-center font-bold rounded-lg hover:brightness-85 dark:hover:brightness-115 transition-colors duration-fast font-headings text-sm",
        VARIANTS["color"][variant][color],
        leftIcon !== undefined ? "pl-4" : "",
        rightIcon !== undefined ? "pr-4" : "",
        disabled === undefined || disabled === false
          ? ""
          : "brightness-75  pointer-events-none",
      )}
      onClick={onClick}
    >
      {leftIcon}
      {children}
      {rightIcon}
    </button>
  );
}
