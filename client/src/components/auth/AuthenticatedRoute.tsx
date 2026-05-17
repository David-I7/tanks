import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type AuthenticatedRouteProps = {
  children: React.ReactNode;
};

export default function AuthenticatedRoute({
  children,
}: AuthenticatedRouteProps) {
  const { user } = useAuth();

  // loading
  if (user === undefined) {
    return <div>Loading User...</div>;
  }

  if (user === null) {
    return <Navigate to={"/login"} />;
  }

  return children;
}
