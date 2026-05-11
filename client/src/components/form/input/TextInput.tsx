import type { ChangeEvent, RefObject } from "react";

type TextInputProps = {
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  ref?: RefObject<HTMLInputElement>;
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
    <div className="flex flex-col gap-1 min-h-10">
      <input
        id={id}
        value={value}
        ref={ref}
        onChange={onChange}
        type="text"
        name={name}
        placeholder={placeholder}
        style={error ? { borderColor: "var(--color-error-main)" } : undefined}
        className="border border-border-high flex-1 rounded-sm focus:border-primary-main focus:border-2 min-h-10 h-10 px-2 outline-none"
      />

      {error && errorMessage && (
        <div className="text-error-main text-xs ml-2">{errorMessage}</div>
      )}
    </div>
  );
}
