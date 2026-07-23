import { useEffect } from "react";
import AppLayout from "../../components/layouts/AppLayout";
import { useLocation } from "react-router-dom";
import { useAssetStore } from "../../store/useAssetStore";
import { REDIRECT_KEY } from "../../constants";
import { BrowserStorage } from "../../utils/storage";
import RefreshUserStatusDecorator from "./RefreshUserStatusDecorator";
import { useAuthStore } from "../../store/useAuthStore";

export default function AppLayoutDecorator() {
  const location = useLocation();
  const loadAssets = useAssetStore((state) => state.loadAssets);

  useEffect(() => {
    loadAssets();
  }, [loadAssets]);

  useEffect(() => {
    const publicNonAuthPaths = ["/", "/game/local"];
    if (publicNonAuthPaths.includes(location.pathname)) {
      new BrowserStorage(sessionStorage).remove(REDIRECT_KEY);
    }
  }, [location.pathname]);

  return (
    <RefreshUserStatusDecorator>
      <>
        <CheckResumeSession />
        <AppLayout />
      </>
    </RefreshUserStatusDecorator>
  );
}

function CheckResumeSession() {
  const location = useLocation();
  const userStatus = useAuthStore((state) => state.userStatus);

  useEffect(() => {
    if (userStatus == null || userStatus.state !== "IN_GAME") return;

    if (location.pathname.includes(`/game`)) return;

    // Redirect to the game page
    window.location.href = `/game/${userStatus.gameId}`;
  }, [location.pathname, userStatus]);

  return null;
}
