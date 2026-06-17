import { Outlet } from "react-router-dom";
import ThemeToggle from "../misc/ThemeToggle";

export default function AppLayout() {
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
