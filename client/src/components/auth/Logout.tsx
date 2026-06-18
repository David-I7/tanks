import { useAuthStore } from "../../store/useAuthStore";
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
  const handleLogout = useAuthStore(state => state.handleLogout);

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
