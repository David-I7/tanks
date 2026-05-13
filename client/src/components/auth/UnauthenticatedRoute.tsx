import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type UnauthenticatedRouteProps = {
  children: React.ReactNode;
};

export default function UnauthenticatedRoute({
  children,
}: UnauthenticatedRouteProps) {
  const { user } = useAuth();

  // loading
  if (user === undefined) {
    return <div>Loading User...</div>;
  }

  if (user !== null) {
    return <Navigate to={"/"} replace />;
  }

  return children;
}
