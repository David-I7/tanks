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
    const publicNonAuthPaths = ["/", "/test", "/game/local"];
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
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);
  const hasChecked = useRef(false);

  useEffect(() => {
    if (user === null || hasChecked.current) return;

    hasChecked.current = true;
    status()
      .then((status) => {
        const userStatus = status.userSessionStatus;

        if (userStatus.state === "IN_LOBBY") {
          navigate(`/lobby/${userStatus.lobbyId}`, { replace: true });
        } else if (userStatus.state === "IN_GAME") {
          navigate(`/game/${userStatus.gameId}`, { replace: true });
        }
      })
      .catch((err) => {});
  }, [user, location.pathname]);

  return null;
}
