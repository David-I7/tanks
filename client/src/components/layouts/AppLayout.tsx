import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <main className="bg-background font-body text-text-body min-h-screen">
      <Outlet />
    </main>
  );
}
