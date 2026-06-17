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
  id: string;
};

export default function Password({
  onChange,
  ref,
  value,
  error,
  errorMessage,
  id,
}: PasswordProps) {
  const [visible, setVisible] = useState<boolean>(false);
  const [focused, setFocused] = useState<boolean>(false);

  return (
    <div className="flex flex-col gap-1 w-full">
      <div
        className={twMerge(
          "flex rounded-lg bg-surface-main/80 border min-h-11 h-11 items-center justify-between pl-3 pr-1 transition-all duration-normal",
          error
            ? "border-error"
            : "border-accent/40",
          focused
            ? error
              ? "border-error shadow-[0_0_8px_rgba(255,49,49,0.3)]"
              : "border-accent shadow-[0_0_8px_rgba(0,240,255,0.3)]"
            : ""
        )}
      >
        <input
          id={id}
          className="flex-1 bg-transparent border-0 outline-none text-text-body-high font-body placeholder:text-text-disabled h-full py-2"
          value={value}
          placeholder="Password..."
          ref={ref}
          onChange={onChange}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          type={visible ? "text" : "password"}
          name="password"
        />
        <IconButton
          onClick={() => setVisible(!visible)}
          className="border-none bg-transparent h-9 w-9 text-text-body/60 hover:text-accent hover:bg-transparent hover:shadow-none"
        >
          {visible ? <Eye size={16} /> : <EyeOff size={16} />}
        </IconButton>
      </div>

      {error && errorMessage && (
        <div className="text-error text-xs mt-0.5 ml-1 font-body">{errorMessage}</div>
      )}
    </div>
  );
}
