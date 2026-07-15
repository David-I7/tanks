import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { REDIRECT_KEY } from "../../constants";
import { BrowserStorage } from "../../utils/storage";
import H1 from "../headings/H1";

type AuthenticatedRouteProps = {
  children: React.ReactNode;
};

export default function AuthenticatedRoute({
  children,
}: AuthenticatedRouteProps) {
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);
  const location = useLocation();

  if (!initialized) {
    return <H1>LOADING!!!</H1>;
  }

  if (user === null) {
    new BrowserStorage<string>(sessionStorage).set(
      REDIRECT_KEY,
      location.pathname + location.search,
    );
    return <Navigate to={"/login"} replace />;
  }

  return children;
}
