import { createRoot } from "react-dom/client";
import React from "react";
import "./style.css";
import "@fontsource/inter/400.css";
import "@fontsource/poppins/400.css";
import App from "./App";
import AuthProvider from "./context/AuthContext";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import HomePage from "./pages/home/HomePage";
import UnauthenticatedRoute from "./components/auth/UnauthenticatedRoute";
import AuthenticatedRoute from "./components/auth/AuthenticatedRoute";
import LobbyPage from "./pages/lobby/LobbyPage";
import LoginPage from "./pages/login/LoginPage";
import RegisterPage from "./pages/register/RegisterPage";

const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  {
    path: "/login",
    element: (
      <UnauthenticatedRoute>
        <LoginPage />
      </UnauthenticatedRoute>
    ),
  },
  {
    path: "/signup",
    element: (
      <UnauthenticatedRoute>
        <RegisterPage />
      </UnauthenticatedRoute>
    ),
  },
  {
    path: "/lobby/:id",
    element: (
      <AuthenticatedRoute>
        <LobbyPage />
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
