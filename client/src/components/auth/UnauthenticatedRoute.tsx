import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";

type UnauthenticatedRouteProps = {
  children: React.ReactNode;
};

export default function UnauthenticatedRoute({
  children,
}: UnauthenticatedRouteProps) {
  const user = useAuthStore(state => state.user);
  const location = useLocation();
  const redirectUri =
    location.state && typeof location.state["from"] === "string"
      ? location.state["from"]
      : "/";
  const redirectState = location.state;

  if (user !== null) {
    return <Navigate state={redirectState} to={redirectUri} replace />;
  }

  return children;
}
