// import {create} from "zustand"
// import type RegisterRequestDto from "../api/http/dto/RegisterRequestDto";
// import type PostOauth2RegisterRequestDto from "../api/http/dto/PostOauth2RegisterRequestDto";
// import type PostOauth2LoginRequestDto from "../api/http/dto/PostOauth2LoginRequestDto";
// import { useAuthStore } from "./useAuthStore";
// import { useFetch } from "../hooks/useFetch";

// type AuthFormState = {
//     isLoading: boolean;
//     state: "pending" | "success" | "error" | "idle";
//     error: Error | null;
//     register: (registerRequest: RegisterRequestDto) => Promise<void>;
//     postOAuth2Register(
//         registerRequest: PostOauth2RegisterRequestDto,
//     ): Promise<void>;
//     postOAuth2Login(loginRequest: PostOauth2LoginRequestDto): Promise<void>;
// }

// const useAuthForm = create<AuthFormState>((set,get) => {
//     const {} = useFetch()

//     const login = useAuthStore.getState().login

//     async function handleLogin(loginRequest: LoginRequestDto) {
//         await handleFormAuthentication(new LoginRequest(loginRequest));
//     }

//     async function handleRegister(registerRequest: RegisterRequestDto) {
//         await handleFormAuthentication(new RegisterRequest(registerRequest));
//     }

//     async function handlePostOAuth2Login(request: PostOauth2LoginRequestDto) {
//         await handleFormAuthentication(new PostOauth2LoginRequest(request));
//     }

//     async function handlePostOAuth2Register(
//         request: PostOauth2RegisterRequestDto,
//     ) {
//         await handleFormAuthentication(new PostOauth2RegisterRequest(request));
//     }

//   return{

//   }
// })
