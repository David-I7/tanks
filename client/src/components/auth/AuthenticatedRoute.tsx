import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type AuthenticatedRouteProps = {
  children: React.ReactNode;
};

export default function AuthenticatedRoute({
  children,
}: AuthenticatedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();

  // loading
  if (loading) {
    return <div>Loading User...</div>;
  }

  if (user === null) {
    return (
      <Navigate state={{ from: location.pathname }} to={"/login"} replace />
    );
  }

  return children;
}
