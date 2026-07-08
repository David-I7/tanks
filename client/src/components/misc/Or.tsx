import { twMerge } from "tailwind-merge";

type OrProps = {
  className?: string;
};

export default function Or({ className }: OrProps) {
  return (
    <div
      className={twMerge(
        "text-xs text-text-body/70 flex items-center gap-4 uppercase tracking-wide my-2 select-none",
        className,
      )}
    >
      <div className="h-px bg-divider flex-1"></div>
      <span className="font-semibold">OR</span>
      <div className="h-px bg-divider flex-1"></div>
    </div>
  );
}
