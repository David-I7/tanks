import { Outlet } from "react-router-dom";
import ThemeToggle from "../misc/ThemeToggle";
import { useEffect, useRef } from "react";
import { BrowserStorage } from "../../utils/storage";
import { REDIRECT_KEY } from "../../constants";
import { useLocation, useNavigate } from "react-router-dom";
import AppBackground from "./AppBackground";
import { useAuthStore } from "../../store/useAuthStore";

export default function AppLayout() {
  const location = useLocation();

  useEffect(() => {
    const publicNonAuthPaths = ["/", "/test"];
    if (publicNonAuthPaths.includes(location.pathname)) {
      new BrowserStorage(sessionStorage).remove(REDIRECT_KEY);
    }
  }, [location.pathname]);
  return (
    <AppBackground>
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="w-full min-h-screen">
        <SessionResume />
        <Outlet />
      </div>
    </AppBackground>
  );
}

function SessionResume() {
  const location = useLocation();
  const navigate = useNavigate();
  const authState = useAuthStore(state => state.state);
  const getAuthStatus = useAuthStore(state => state.getAuthStatus);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (authState !== "authenticated" || hasChecked.current) return;

    hasChecked.current = true;
    void getAuthStatus().then((status) => {
      const userSessionStatus = status?.userSessionStatus;
      if (!userSessionStatus || location.pathname !== "/") return;

      if (userSessionStatus.state === "IN_LOBBY") {
        navigate(`/lobby/${userSessionStatus.lobbyId}`, { replace: true });
      } else if (userSessionStatus.state === "IN_GAME") {
        navigate(`/game/${userSessionStatus.gameId}`, { replace: true });
      }
    });
  }, [authState, getAuthStatus, location.pathname, navigate]);

  return null;
}
