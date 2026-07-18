import { useEffect } from "react";
import { useFetch } from "../../hooks/useFetch";
import { useAuthStore } from "../../store/useAuthStore";
import Button, { type ButtonProps } from "../buttons/Button";
import Loader from "../misc/Loader";

type LogoutProps = {
  onSuccess: () => void;
  onFailure: (err: Error) => void;
} & Omit<ButtonProps, "onClick" | "children">;

export default function Logout({
  onSuccess,
  onFailure,
  ...buttonProps
}: LogoutProps) {
  const logout = useAuthStore((state) => state.logout);
  const { trigger, isLoading, error, state } = useFetch(() => logout());

  useEffect(() => {
    if (state === "success") {
      onSuccess();
    } else if (state === "error") {
      onFailure(error!);
    }
  }, [state]);

  return (
    <Button disabled={isLoading} {...buttonProps} onClick={() => trigger()}>
      {isLoading ? <Loader /> : "Logout"}
    </Button>
  );
}
