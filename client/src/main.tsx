import { createRoot } from "react-dom/client";
import "./style.css";
import "@fontsource/inter/400.css";
import "@fontsource/poppins/400.css";
import AuthProvider from "./context/AuthContext";
import { createBrowserRouter, RouterProvider } from "react-router-dom";
import HomePage from "./pages/home/HomePage";
import UnauthenticatedRoute from "./components/auth/UnauthenticatedRoute";
import AuthenticatedRoute from "./components/auth/AuthenticatedRoute";
import LobbyPage from "./pages/lobby/LobbyPage";
import LoginPage from "./pages/login/LoginPage";
import RegisterPage from "./pages/register/RegisterPage";
import AppLayout from "./components/layouts/AppLayout";
import TestPage from "./pages/test/TestPage";
import GlobalErrorPage from "./pages/error/GlobalErrorPage";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout />,
    errorElement: <GlobalErrorPage />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: "login",
        element: (
          <UnauthenticatedRoute>
            <LoginPage />
          </UnauthenticatedRoute>
        ),
      },
      {
        path: "signup",
        element: (
          <UnauthenticatedRoute>
            <RegisterPage />
          </UnauthenticatedRoute>
        ),
      },
      {
        path: "lobby/:id",
        element: (
          <AuthenticatedRoute>
            <LobbyPage />
          </AuthenticatedRoute>
        ),
      },
      {
        path: "test",
        element: <TestPage />,
      },
    ],
  },
]);

const root = createRoot(document.querySelector<HTMLDivElement>("#app")!);
root.render(
  //<React.StrictMode>
  <AuthProvider>
    <RouterProvider router={router} />
  </AuthProvider>,
  //</React.StrictMode>,
);
