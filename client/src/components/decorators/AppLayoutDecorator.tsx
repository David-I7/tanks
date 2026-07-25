import { useEffect } from "react";
import AppLayout from "../../components/layouts/AppLayout";
import { useLocation } from "react-router-dom";
import { useAssetQuery } from "../../hooks/useAssetQuery";
import { REDIRECT_KEY } from "../../constants";
import { BrowserStorage } from "../../utils/storage";
import { useUserStatusQuery } from "../../hooks/useUserStatusQuery";

export default function AppLayoutDecorator() {
  const location = useLocation();
  useAssetQuery();
  useUserStatusQuery();

  useEffect(() => {
    const publicNonAuthPaths = ["/", "/game/local"];
    if (publicNonAuthPaths.includes(location.pathname)) {
      new BrowserStorage(sessionStorage).remove(REDIRECT_KEY);
    }
  }, [location.pathname]);

  return (
    <>
      <CheckResumeSession />
      <AppLayout />
    </>
  );
}

function CheckResumeSession() {
  const location = useLocation();
  const { data: userStatus } = useUserStatusQuery();

  useEffect(() => {
    if (userStatus == null || userStatus.state !== "IN_GAME") return;

    if (location.pathname.includes(`/game`)) return;

    // Redirect to the game page
    window.location.href = `/game/${userStatus.gameId}`;
  }, [location.pathname, userStatus]);

  return null;
}
