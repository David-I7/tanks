import React, { useState, type ChangeEvent, type RefObject } from "react";
import { EyeOff, Eye } from "lucide-react";
import IconButton from "../../buttons/IconButton";

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

  return (
    <div className="flex flex-col gap-1">
      <div
        style={error ? { borderColor: "var(--color-error-main)" } : undefined}
        className="border border-border-high flex rounded-sm focus-within:border-primary-main focus-within:border-2 h-10 justify-center px-2"
      >
        <input
          id={id}
          className="flex-1 outline-none"
          value={value}
          placeholder="Password..."
          ref={ref}
          onChange={onChange}
          type={visible ? "text" : "password"}
          name="password"
        />
        <IconButton onClick={() => setVisible(!visible)}>
          {visible && <Eye size={16} />}
          {!visible && <EyeOff size={16} />}
        </IconButton>
      </div>

      {error && errorMessage && (
        <div className="text-error-main text-xs ml-2">{errorMessage}</div>
      )}
    </div>
  );
}
