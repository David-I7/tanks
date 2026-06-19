import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { REDIRECT_KEY } from "../../constants";
import { BrowserStorage } from "../../utils/storage";

type AuthenticatedRouteProps = {
  children: React.ReactNode;
};

export default function AuthenticatedRoute({
  children,
}: AuthenticatedRouteProps) {
  const user = useAuthStore(state => state.user);
  const location = useLocation();

  if (user === null) {
    new BrowserStorage<string>(sessionStorage).set(REDIRECT_KEY, location.pathname + location.search);
    return (
      <Navigate to={"/login"} replace />
    );
  }

  return children;
}
