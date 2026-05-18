import type React from "react";
import type { MouseEvent, ReactNode } from "react";

type IconButtonProps = {
  onClick?: (e: MouseEvent) => void;
  icon: ReactNode;
  type?: React.ButtonHTMLAttributes<HTMLButtonElement>["type"];
};

export default function IconButton({
  icon,
  onClick,
  type = "button",
}: IconButtonProps) {
  return (
    <button
      type={type}
      className="cursor-pointer h-10 w-10 grid place-content-center rounded-full"
      onClick={onClick}
    >
      {icon}
    </button>
  );
}
