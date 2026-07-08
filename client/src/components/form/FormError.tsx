import { twMerge } from "tailwind-merge";

type FormErrorProps = {
  children: string;
  className?: string;
};

export default function FormError({ children, className }: FormErrorProps) {
  return (
    <div
      className={twMerge(
        "rounded-lg border border-error/30 bg-error/10 p-2.5 text-xs font-semibold text-error",
        className,
      )}
    >
      {children}
    </div>
  );
}
