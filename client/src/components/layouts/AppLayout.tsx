import { Outlet } from "react-router-dom";
import ThemeToggle from "../misc/ThemeToggle";
import { useEffect } from "react";
import { BrowserStorage } from "../../utils/storage";
import { REDIRECT_KEY } from "../../constants";
import { useLocation } from "react-router-dom";

export default function AppLayout() {
  const location = useLocation();

  useEffect(() => {
    const publicNonAuthPaths = ["/", "/test"];
    if (publicNonAuthPaths.includes(location.pathname)) {
      new BrowserStorage(sessionStorage).remove(REDIRECT_KEY);
    }
  }, [location.pathname]);
  return (
    <main className="bg-background font-body text-text-body min-h-screen relative overflow-hidden">
      <div className="cyber-bg-container">
        <div className="cyber-grid"></div>
        <div className="cyber-grid-overlay"></div>
      </div>
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="relative z-10 w-full min-h-screen">
        <Outlet />
      </div>
    </main>
  );
}
