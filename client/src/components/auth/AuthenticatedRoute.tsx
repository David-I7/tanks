import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type AuthenticatedRouteProps = {
  children: React.ReactNode;
};

export default function AuthenticatedRoute({
  children,
}: AuthenticatedRouteProps) {
  const { user, loading } = useAuth();

  // loading
  if (loading) {
    return <div>Loading User...</div>;
  }

  if (user === null) {
    return <Navigate to={"/login"} />;
  }

  return children;
}
