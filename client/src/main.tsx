import { createRoot } from "react-dom/client";
import React from "react";
import "./style.css";
import "@fontsource/inter/400.css";
import "@fontsource/poppins/400.css";
import App from "./App";
import AuthProvider from "./context/AuthContext";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import HomePage from "./pages/home/HomePage";
import AuthPage from "./pages/auth/AuthenticationPage";
import LoginForm from "./pages/auth/LoginForm";
import RegisterForm from "./pages/auth/RegisterForm";
import UnauthenticatedRoute from "./components/auth/UnauthenticatedRoute";
import AuthenticatedRoute from "./components/auth/AuthenticatedRoute";

const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  {
    path: "/login",
    element: (
      <UnauthenticatedRoute>
        <AuthPage>
          <LoginForm />
        </AuthPage>
      </UnauthenticatedRoute>
    ),
  },
  {
    path: "/signup",
    element: (
      <UnauthenticatedRoute>
        <AuthPage>
          <RegisterForm />
        </AuthPage>
      </UnauthenticatedRoute>
    ),
  },
  {
    path: "/lobby",
    element: (
      <AuthenticatedRoute>
        <div>Lobby</div>
      </AuthenticatedRoute>
    ),
  },
]);

const root = createRoot(document.querySelector<HTMLDivElement>("#app")!);
root.render(
  <React.StrictMode>
    <AuthProvider>
      <App>
        <RouterProvider router={router} />
      </App>
    </AuthProvider>
  </React.StrictMode>,
);
