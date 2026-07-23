import { Outlet } from "react-router-dom";
import ThemeToggle from "../misc/ThemeToggle";
import { type ReactNode } from "react";
import AppBackground from "./AppBackground";

export default function AppLayout({ children }: { children?: ReactNode }) {
  return (
    <AppBackground>
      <div className="absolute top-4 right-4 z-50">
        <ThemeToggle />
      </div>
      <div className="w-full min-h-screen">
        {children}
        <Outlet />
      </div>
    </AppBackground>
  );
}
