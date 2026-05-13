import type { ReactNode } from "react";

type AuthPageProps = { children: ReactNode };

export default function AuthPage({ children }: AuthPageProps) {
  return (
    <div className="p-4 md:p-6 lg:p-8 h-screen min-h-screen grid place-items-center">
      {children}
    </div>
  );
}
