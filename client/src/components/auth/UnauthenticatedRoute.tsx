import { Navigate } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";
import { BrowserStorage } from "../../utils/storage";
import { REDIRECT_KEY } from "../../constants";
import H1 from "../headings/H1";

type UnauthenticatedRouteProps = {
  children: React.ReactNode;
};

export default function UnauthenticatedRoute({
  children,
}: UnauthenticatedRouteProps) {
  const user = useAuthStore((state) => state.user);
  const initialized = useAuthStore((state) => state.initialized);

  if (!initialized) {
    return <H1>LOADING!!!</H1>;
  }

  if (user !== null) {
    const redirectUri =
      new BrowserStorage<string>(sessionStorage).getAndRemove(REDIRECT_KEY) ||
      "/";
    return <Navigate to={redirectUri} replace />;
  }

  return children;
}
