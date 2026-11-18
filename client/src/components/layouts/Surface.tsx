import { type HTMLAttributes, forwardRef } from "react";
import { twMerge } from "tailwind-merge";

export type SurfaceProps = HTMLAttributes<HTMLDivElement>;

const Surface = forwardRef<HTMLDivElement, SurfaceProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={twMerge(
          "rounded-2xl border border-border-main bg-surface-main shadow-md",
          className,
        )}
        {...props}
      >
        {children}
      </div>
    );
  },
);

Surface.displayName = "Surface";

export default Surface;
