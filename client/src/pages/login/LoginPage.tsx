import { useEffect } from "react";
import LoginForm from "./LoginForm";
import { useAuthStore } from "../../store/useAuthStore";

export default function LoginPage() {
  const clearError = useAuthStore(state => state.clearError)
  const error = useAuthStore(state => state.error)

  useEffect(() => {
    if (error !== null) {
      clearError();
    }
  }, []);

  return (
    <div className="p-4 md:p-6 lg:p-8 h-screen min-h-screen grid place-items-center">
      <LoginForm />
    </div>
  );
}
