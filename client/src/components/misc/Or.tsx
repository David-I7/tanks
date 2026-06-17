import { twMerge } from "tailwind-merge";

type OrProps = {
  className?: string;
};

export default function Or({ className }: OrProps) {
  return (
    <div
      className={twMerge(
        "text-xs text-text-body/60 font-body flex items-center gap-4 uppercase tracking-widest my-2 select-none",
        className,
      )}
    >
      <div className="h-[1px] bg-gradient-to-r from-transparent to-accent/40 flex-1"></div>
      <span className="text-accent font-bold">OR</span>
      <div className="h-[1px] bg-gradient-to-r from-accent/40 to-transparent flex-1"></div>
    </div>
  );
}
