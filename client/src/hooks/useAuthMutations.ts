import { useMutation } from "@tanstack/react-query";
import { useAuthStore } from "../store/useAuthStore";
import { queryClient } from "../query/queryClient";
import type LoginRequest from "../api/http/requests/auth/LoginRequest";
import type RegisterRequest from "../api/http/requests/auth/RegisterRequest";
import type PostOauth2LoginRequest from "../api/http/requests/auth/PostOAuth2LoginRequest";
import type PostOauth2RegisterRequest from "../api/http/requests/auth/PostOauth2RegisterRequest";

export function useLoginMutation() {
  const passwordLogin = useAuthStore((state) => state.passwordLogin);

  return useMutation({
    mutationFn: (request: LoginRequest) => passwordLogin(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userStatus"] });
    },
  });
}

export function useOAuth2LoginMutation() {
  const postOAuth2Login = useAuthStore((state) => state.postOAuth2Login);

  return useMutation({
    mutationFn: (request: PostOauth2LoginRequest) => postOAuth2Login(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userStatus"] });
    },
  });
}

export function useRegisterMutation() {
  const passwordRegister = useAuthStore((state) => state.passwordRegister);

  return useMutation({
    mutationFn: (request: RegisterRequest) => passwordRegister(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userStatus"] });
    },
  });
}

export function useOAuth2RegisterMutation() {
  const postOAuth2Register = useAuthStore((state) => state.postOAuth2Register);

  return useMutation({
    mutationFn: (request: PostOauth2RegisterRequest) =>
      postOAuth2Register(request),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userStatus"] });
    },
  });
}

export function useLogoutMutation() {
  const logout = useAuthStore((state) => state.logout);

  return useMutation({
    mutationFn: () => logout(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userStatus"] });
    },
  });
}
