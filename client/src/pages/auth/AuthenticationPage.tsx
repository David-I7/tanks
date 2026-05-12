import { useState } from "react";
import LoginForm from "./LoginForm";
import RegisterForm from "./RegisterForm";

export type ActiveForm = "REGISTER" | "LOGIN" | "PARTIAL_REGISTER";

export default function AuthPage() {
  const [activeForm, setActiveForm] = useState<ActiveForm>("LOGIN");

  return (
    <div className="p-4 md:p-6 lg:p-8 h-screen min-h-screen grid place-items-center">
      {activeForm === "LOGIN" && <LoginForm setActiveForm={setActiveForm} />}
      {activeForm === "REGISTER" && (
        <RegisterForm setActiveForm={setActiveForm} />
      )}
    </div>
  );
}
