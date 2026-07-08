import type { ChangeEvent, RefObject } from "react";
import { twMerge } from "tailwind-merge";

type TextInputProps = {
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  ref?: RefObject<HTMLInputElement | null>;
  value?: string;
  error?: boolean;
  errorMessage?: string;
  placeholder?: string;
  autoComplete?: string;
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
  autoComplete,
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
        autoComplete={autoComplete}
        className={twMerge(
          "flex-1 rounded-lg text-text-body-high bg-surface-main border min-h-11 h-11 px-3 outline-none transition-colors duration-normal placeholder:text-text-disabled disabled:cursor-not-allowed disabled:opacity-60",
          error
            ? "border-error focus:border-error"
            : "border-border-main focus:border-primary"
        )}
      />

      {error && errorMessage && (
        <div className="text-error text-xs mt-0.5 ml-1">{errorMessage}</div>
      )}
    </div>
  );
}
