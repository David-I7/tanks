import type { ReactNode } from "react";
import TestPage from "./pages/test/TestPage";

type AppProps = { children: ReactNode };

export default function App({ children }: AppProps) {
  return (
    <main className="bg-background font-body text-text-body min-h-screen">
      {/* <TestPage /> */}
      {children}
    </main>
  );
}
