import { twMerge } from "tailwind-merge";

type LoaderProps = {
  className?: string;
};

function Loader({ className }: LoaderProps) {
  return (
    <div className="flex items-center justify-center">
      <div
        className={twMerge(
          "animate-spin w-6 h-6 border-3 border-primary border-b-transparent rounded-full inline-block",
          className,
        )}
      ></div>
    </div>
  );
}

export default Loader;
