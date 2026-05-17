import React from "react";
import { useAuth } from "../../context/AuthContext";
import Button, { type ButtonProps } from "../buttons/Button";

type LogoutProps = {
  onSuccess: () => void;
  onFailure: (err: Error) => void;
} & Omit<ButtonProps, "onClick" | "children">;

export default function Logout({
  onSuccess,
  onFailure,
  ...buttonProps
}: LogoutProps) {
  const { handleLogout } = useAuth();

  const handleLogoutProxy = () => {
    try {
      handleLogout();
      onSuccess();
    } catch (err) {
      onFailure(err as Error);
    }
  };

  return (
    <Button {...buttonProps} onClick={handleLogoutProxy}>
      Logout
    </Button>
  );
}
