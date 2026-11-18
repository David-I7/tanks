import { Outlet } from "react-router-dom";
import ThemeToggle from "../misc/ThemeToggle";
import { useAssetQuery } from "../../hooks/useAssetQuery";

export default function AppLayout() {
  useAppLayout();
  return (
    <main className="min-h-screen bg-background text-text-body font-body relative overflow-hidden">
      <div className="relative z-10 min-h-screen">
        <div className="absolute top-4 right-4 z-50">
          <ThemeToggle />
        </div>
        <div className="w-full min-h-screen">
          <Outlet />
        </div>
      </div>
    </main>
  );
}

function useAppLayout() {
  useAssetQuery();
}
