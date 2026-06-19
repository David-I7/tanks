import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { BrowserStorage } from "../../utils/storage";
import { REDIRECT_KEY } from "../../constants";

type UnauthenticatedRouteProps = {
  children: React.ReactNode;
};

export default function UnauthenticatedRoute({
  children,
}: UnauthenticatedRouteProps) {
  const user = useAuthStore(state => state.user);

  if (user !== null) {
    const redirectUri = new BrowserStorage<string>(sessionStorage).getAndRemove(REDIRECT_KEY) || "/";
    return <Navigate to={redirectUri} replace />;
  }

  return children;
}
