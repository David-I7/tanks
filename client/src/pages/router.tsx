import { createBrowserRouter } from "react-router-dom";
import AppLayoutDecorator from "../components/decorators/AppLayoutDecorator";
import GlobalErrorPage from "./error/GlobalErrorPage";
import HomePage from "./home/HomePage";
import UnauthenticatedRoute from "../components/auth/UnauthenticatedRoute";
import LoginPage from "./login/LoginPage";
import RegisterPage from "./register/RegisterPage";
import AuthenticatedRoute from "../components/auth/AuthenticatedRoute";
import LobbyPage from "./lobby/LobbyPage";
import GamePage from "./game/GamePage";
import RefreshUserStatusDecorator from "../components/decorators/RefreshUserStatusDecorator";

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayoutDecorator />,
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
            <RefreshUserStatusDecorator blocking fallback={null}>
              <LobbyPage />
            </RefreshUserStatusDecorator>
          </AuthenticatedRoute>
        ),
      },
      {
        path: "game/:id",
        element: (
          <AuthenticatedRoute>
            <RefreshUserStatusDecorator blocking fallback={null}>
              <GamePage />
            </RefreshUserStatusDecorator>
          </AuthenticatedRoute>
        ),
      },
    ],
  },
]);

export default router;
