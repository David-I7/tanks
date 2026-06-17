import type { ChangeEvent, RefObject } from "react";
import { twMerge } from "tailwind-merge";

type TextInputProps = {
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  ref?: RefObject<HTMLInputElement | null>;
  value?: string;
  error?: boolean;
  errorMessage?: string;
  placeholder?: string;
  name: string;
  id: string;
};

export default function TextInput({
  onChange,
  ref,
  value,
  error,
  errorMessage,
  placeholder,
  name,
  id,
}: TextInputProps) {
  return (
    <div className="flex flex-col gap-1 w-full">
      <input
        id={id}
        value={value}
        ref={ref}
        onChange={onChange}
        type="text"
        name={name}
        placeholder={placeholder}
        className={twMerge(
          "flex-1 rounded-lg text-text-body-high bg-surface-main/80 border min-h-11 h-11 px-3 outline-none font-body transition-all duration-normal placeholder:text-text-disabled",
          error
            ? "border-error focus:border-error focus:shadow-[0_0_8px_rgba(255,49,49,0.3)]"
            : "border-accent/40 focus:border-accent focus:shadow-[0_0_8px_rgba(0,240,255,0.3)]"
        )}
      />

      {error && errorMessage && (
        <div className="text-error text-xs mt-0.5 ml-1 font-body">{errorMessage}</div>
      )}
    </div>
  );
}
