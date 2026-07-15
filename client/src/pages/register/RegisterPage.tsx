import { useLocation } from "react-router-dom";
import type OAuth2LoginResponseDto from "../../api/http/dto/OAuth2LoginResponseDto";
import RegisterForm from "./RegisterForm";
import PostOAuth2RegisterForm from "./PostOAuth2RegisterForm";

export default function RegisterPage() {
  const location = useLocation();
  const state: OAuth2LoginResponseDto | undefined = location.state;

  const isPartial =
    state &&
    state.type === "OAUTH2_PARTIAL" &&
    new URLSearchParams(location.search).has("partial", "");
  const token = isPartial ? state.token : null;

  return (
    <div className="p-4 md:p-6 lg:p-8 h-screen min-h-screen grid place-items-center">
      {!isPartial && <RegisterForm />}
      {isPartial && token && <PostOAuth2RegisterForm token={token} />}
    </div>
  );
}
