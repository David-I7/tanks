import { twMerge } from "tailwind-merge";

type LoaderProps = {
  className?: string;
};

function Loader({ className }: LoaderProps) {
  return (
    <div
      className={twMerge(
        "animate-spin w-6 h-6 border-3 border-surface-inverse border-b-transparent rounded-[50%] inline-block",
        className,
      )}
    ></div>
  );
}

export default Loader;
