import { Navigate, useLocation } from "react-router-dom";
import { useAuthStore } from "../../store/useAuthStore";

type AuthenticatedRouteProps = {
  children: React.ReactNode;
};

export default function AuthenticatedRoute({
  children,
}: AuthenticatedRouteProps) {
  const user = useAuthStore(state => state.user);
  const location = useLocation();

  if (user === null) {
    return (
      <Navigate state={{ from: location.pathname }} to={"/login"} replace />
    );
  }

  return children;
}
