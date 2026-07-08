import { useState, type ChangeEvent, type RefObject } from "react";
import { EyeOff, Eye } from "lucide-react";
import IconButton from "../../buttons/IconButton";
import { twMerge } from "tailwind-merge";

type PasswordProps = {
  onChange?: (e: ChangeEvent<HTMLInputElement>) => void;
  ref?: RefObject<HTMLInputElement>;
  value?: string;
  error?: boolean;
  errorMessage?: string;
  autoComplete?: string;
  id: string;
};

export default function Password({
  onChange,
  ref,
  value,
  error,
  errorMessage,
  autoComplete,
  id,
}: PasswordProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const [focused, setFocused] = useState<boolean>(false);

  return (
    <div className="flex flex-col gap-1 w-full">
      <div
        className={twMerge(
          "flex rounded-lg bg-surface-main border min-h-11 h-11 items-center justify-between pl-3 pr-1 transition-colors duration-normal",
          error
            ? "border-error"
            : "border-border-main",
          focused
            ? error
              ? "border-error"
              : "border-primary"
            : ""
        )}
      >
        <input
          id={id}
          className="flex-1 bg-transparent border-0 outline-none text-text-body-high placeholder:text-text-disabled h-full py-2"
          value={value}
          placeholder="Password..."
          ref={ref}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          type={visible ? "text" : "password"}
          name="password"
          autoComplete={autoComplete}
        />
        <IconButton
          onClick={() => setVisible(!visible)}
          className="border-none bg-transparent h-9 w-9 text-text-body/60 hover:text-text-body-high"
        >
          {visible ? <Eye size={16} /> : <EyeOff size={16} />}
        </IconButton>
      </div>

      {error && errorMessage && (
        <div className="text-error text-xs mt-0.5 ml-1">{errorMessage}</div>
      )}
    </div>
  );
}
