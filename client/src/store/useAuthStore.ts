import { create } from "zustand";
import TanksClient from "../api/http/TanksClient";
import LogoutRequest from "../api/http/requests/auth/LogoutRequest";
import type User from "../api/http/dto/UserDto";
import type LoginRequestDto from "../api/http/dto/LoginRequestDto";
import LoginRequest from "../api/http/requests/auth/LoginRequest";
import RegisterRequest from "../api/http/requests/auth/RegisterRequest";
import type RegisterRequestDto from "../api/http/dto/RegisterRequestDto";
import RefreshRequest from "../api/http/requests/auth/RefreshRequest";
import type PostOauth2LoginRequestDto from "../api/http/dto/PostOauth2LoginRequestDto";
import PostOauth2LoginRequest from "../api/http/requests/auth/PostOAuth2LoginRequest";
import type PostOauth2RegisterRequestDto from "../api/http/dto/PostOauth2RegisterRequestDto";
import PostOauth2RegisterRequest from "../api/http/requests/auth/PostOauth2RegisterRequest";
import type { TanksRequest } from "../api/http/requests/TanksRequest";
import type RefreshResponseDto from "../api/http/dto/RefreshResponseDto";

type AuthState = {
    user: User | null;
    accessToken: string | null;
    loading: boolean;
    state: "loading" | "error" | "authenticated" | "unauthenticated";
    error: Error | null;
    handleLogout: () => Promise<void>;
    handleLogin: (loginRequest: LoginRequestDto) => Promise<void>;
    handleRegister: (registerRequest: RegisterRequestDto) => Promise<void>;
    handlePostOAuth2Register(
        registerRequest: PostOauth2RegisterRequestDto,
    ): Promise<void>;
    handlePostOAuth2Login(loginRequest: PostOauth2LoginRequestDto): Promise<void>;
    handleRefresh: () => Promise<RefreshResponseDto>;
};


export const useAuthStore = create<AuthState>((set) => {
    const tanksClient = new TanksClient();

    function setAuthenticated(value: RefreshResponseDto) {
        set(prev => ({ ...prev, loading: false, user: value.user, accessToken: value.accessToken, state: "authenticated", error: null }));
    }

    function setError(value: Error) {
        set(prev => ({ ...prev, loading: false, error: value, state: "error" }));
    }

    function setUnauthenticated() {
        set(prev => ({ ...prev, loading: false, state: "unauthenticated", error: null, user: null, accessToken: null }));
    }

    function setLoading() {
        set(prev => {
            if (!prev || prev.loading) return prev;

            return { ...prev, loading: true, state: "loading", error: null }
        });
    }

    async function handleRefresh() {
        setLoading();
        try {
            const response = await tanksClient.send(new RefreshRequest());
            TanksClient.setAccessToken(response.accessToken);
            setAuthenticated(response)

            return response;
        } catch (err) {
            TanksClient.setAccessToken("");
            setError(err as Error);
            throw err;
        }
    }

    async function handleFormAuthentication(
        request: TanksRequest<RefreshResponseDto>,
    ) {
        setLoading();
        try {
            const data = await tanksClient.send(request);
            TanksClient.setAccessToken(data.accessToken);
            setAuthenticated(data);
        } catch (err) {
            setError(err as Error);
        }
    }

    async function handleLogin(loginRequest: LoginRequestDto) {
        await handleFormAuthentication(new LoginRequest(loginRequest));
    }

    async function handleRegister(registerRequest: RegisterRequestDto) {
        await handleFormAuthentication(new RegisterRequest(registerRequest));
    }

    async function handlePostOAuth2Login(request: PostOauth2LoginRequestDto) {
        await handleFormAuthentication(new PostOauth2LoginRequest(request));
    }

    async function handlePostOAuth2Register(
        request: PostOauth2RegisterRequestDto,
    ) {
        await handleFormAuthentication(new PostOauth2RegisterRequest(request));
    }

    async function handleLogout() {
        setLoading();
        try {
            await new TanksClient().send(new LogoutRequest());

            TanksClient.setAccessToken("");
            setUnauthenticated();
        } catch (err) {
            setError(err as Error);
        }
    }

    TanksClient.setRefreshHandler(handleRefresh);


    return {
        user: null,
        accessToken: null,
        loading: true,
        state: "loading",
        error: null,
        handleLogin,
        handleRegister,
        handlePostOAuth2Login,
        handlePostOAuth2Register,
        handleLogout,
        handleRefresh,
    }
})