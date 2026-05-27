import React from "react";
import { twMerge } from "tailwind-merge";

type OrProps = {
  className?: string;
};

export default function Or({ className }: OrProps) {
  return (
    <div
      className={twMerge(
        "text-xs text-text-disabled flex items-center gap-2",
        className,
      )}
    >
      <div className="h-[0.5px] bg-text-disabled rounded-full flex-1"></div>
      <div>OR</div>
      <div className="h-[0.5px] bg-text-disabled rounded-full flex-1"></div>
    </div>
  );
}
