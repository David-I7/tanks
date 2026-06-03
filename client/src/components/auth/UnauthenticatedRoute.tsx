import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

type UnauthenticatedRouteProps = {
  children: React.ReactNode;
};

export default function UnauthenticatedRoute({
  children,
}: UnauthenticatedRouteProps) {
  const { user, loading } = useAuth();
  const location = useLocation();
  const redirectUri =
    location.state && typeof location.state["from"] === "string"
      ? location.state["from"]
      : "/";
  const redirectState = location.state;

  // loading
  if (loading) {
    return <div>Loading User...</div>;
  }

  if (user !== null) {
    return <Navigate state={redirectState} to={redirectUri} replace />;
  }

  return children;
}
