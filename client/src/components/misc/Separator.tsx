import { twMerge } from "tailwind-merge";

type SeparatorProps = {
  className?: string;
};

export default function Separator({ className }: SeparatorProps) {
  return <div className={twMerge("h-px w-full bg-divider", className)} />;
}
