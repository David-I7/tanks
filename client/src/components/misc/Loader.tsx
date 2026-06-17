import { twMerge } from "tailwind-merge";

type LoaderProps = {
  className?: string;
};

function Loader({ className }: LoaderProps) {
  return (
    <div className="flex items-center justify-center py-4">
      <div
        className={twMerge(
          "animate-spin w-8 h-8 border-4 border-accent border-b-transparent rounded-full inline-block shadow-[0_0_10px_rgba(0,240,255,0.4)]",
          className,
        )}
      ></div>
    </div>
  );
}

export default Loader;
