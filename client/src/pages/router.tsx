import { createBrowserRouter } from "react-router-dom";
import AppLayoutDecorator from "../components/layouts/AppLayoutDecorator";
import GlobalErrorPage from "./error/GlobalErrorPage";
import HomePage from "./home/HomePage";
import UnauthenticatedRoute from "../components/auth/UnauthenticatedRoute";
import LoginPage from "./login/LoginPage";
import RegisterPage from "./register/RegisterPage";
import AuthenticatedRoute from "../components/auth/AuthenticatedRoute";
import LobbyPage from "./lobby/LobbyPage";
import GamePage from "./game/GamePage";
import LocalGamePage from "./game/LocalGamePage";
import MockGameTestPage from "./test/MockGameTestPage";

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
            <LobbyPage />
          </AuthenticatedRoute>
        ),
      },
      {
        path: "game/:id",
        element: (
          <AuthenticatedRoute>
            <GamePage />
          </AuthenticatedRoute>
        ),
      },
      {
        path: "game/local",
        element: <LocalGamePage />,
      },
      {
        path: "test/mock-game",
        element: <MockGameTestPage />,
      },
    ],
  },
  
]);

export default router;
