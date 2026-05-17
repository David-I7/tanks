import type OAuth2LoginResponseDto from "../../api/http/dto/OAuth2LoginResponseDto";
import Button from "../buttons/Button";
import Google from "../icons/Google";
import { useAuth } from "../../context/AuthContext";
import GoogleLoginRequest from "../../api/http/requests/GoogleLoginRequest";
import { usePopup } from "../../hooks/usePopup";
import { useNavigate } from "react-router-dom";

type GoogleLoginProps = {
  onSuccess: (response: OAuth2LoginResponseDto) => void;
  onFailure: (error: Error) => void;
};

const GOOGLE_LOGIN_URL = import.meta.env.VITE_BASE_API_URL.concat(
  new GoogleLoginRequest().getPath(),
);

export default function GoogleLogin({
  onSuccess,
  onFailure,
}: GoogleLoginProps) {
  const { closePopup, openPopup, isOpen } = usePopup({
    url: GOOGLE_LOGIN_URL,
    onMessageReceived: (message) => {
      const response = message as OAuth2LoginResponseDto;

      if (response.type === "OAUTH2_ERROR") {
        onFailure(new Error("Google login failed. Please try again."));
      } else {
        onSuccess(response);
      }

      closePopup();
    },
  });

  return (
    <Button
      disabled={isOpen}
      onClick={() => openPopup()}
      color="secondary"
      variant="outline"
      leftIcon={<Google />}
    >
      Continue with Google
    </Button>
  );
}

type GoogleLoginWithRedirectProps = {
  onFailure: (error: Error) => void;
};

export function GoogleLoginWithRedirect({
  onFailure,
}: GoogleLoginWithRedirectProps) {
  const navigate = useNavigate();
  const { handlePostOAuth2Login } = useAuth();

  const handleSuccess = async (data: OAuth2LoginResponseDto) => {
    if (data.type === "OAUTH2_SUCCESS") {
      try {
        await handlePostOAuth2Login({ token: data.token! });
      } catch (err) {
        onFailure(err as Error);
      }
    } else if (data.type === "OAUTH2_PARTIAL") {
      navigate("/signup?partial", { state: data });
    }
  };

  return <GoogleLogin onSuccess={handleSuccess} onFailure={onFailure} />;
}
