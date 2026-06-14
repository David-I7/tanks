package com.tanks.server.controllers;

import com.tanks.server.dto.UserDto;
import com.tanks.server.dto.auth.OAuth2LoginResponse;
import com.tanks.server.dto.auth.OAuth2LoginResponseType;
import com.tanks.server.dto.auth.RefreshTokenResponse;
import com.tanks.server.entities.User;
import com.tanks.server.config.SecurityConfig;
import com.tanks.server.security.filters.JwtAuthenticationFilter;
import com.tanks.server.security.model.JwtAuthentication;
import com.tanks.server.security.model.JwtSession;
import com.tanks.server.security.oauth.OAuth2SuccessHandler;
import com.tanks.server.services.AuthService;
import com.tanks.server.utils.ProblemDetailWriter;
import jakarta.servlet.DispatcherType;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseCookie;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.authentication;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = {
        "app.isDev=false",
        "app.client.origin=http://localhost:3000"
})
class AuthControllerTest {

    private static final String BASE_URL = "/api/v1/auth";
    private static final UserDto USER_DTO = new UserDto(1L, "player_one", "player@example.com");

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AuthService authService;

    @MockitoBean
    private ProblemDetailWriter problemDetailWriter;

    @MockitoBean
    private OAuth2SuccessHandler oAuth2SuccessHandler;

    @MockitoBean
    private AuthenticationFailureHandler authenticationFailureHandler;

    @Test
    void statusReturnsAuthenticatedPrincipal() throws Exception {
        mockMvc.perform(post(BASE_URL + "/status")
                        .with(authentication(new JwtAuthentication(USER_DTO))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").value(USER_DTO.id()))
                .andExpect(jsonPath("$.username").value(USER_DTO.username()))
                .andExpect(jsonPath("$.email").value(USER_DTO.email()));

        verifyNoInteractions(authService);
    }

    @Test
    void registerPasswordMapsRequestDelegatesAndReturnsSession() throws Exception {
        JwtSession session = jwtSession("access-token", "refresh-token", USER_DTO);
        when(authService.register(any(User.class))).thenReturn(session);

        mockMvc.perform(post(BASE_URL + "/register/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "password": "password123",
                                  "username": "player_one",
                                  "email": "player@example.com"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, session.cookie().toString()))
                .andExpect(jsonPath("$.accessToken").value(session.accessToken()))
                .andExpect(jsonPath("$.user.id").value(USER_DTO.id()))
                .andExpect(jsonPath("$.user.username").value(USER_DTO.username()))
                .andExpect(jsonPath("$.user.email").value(USER_DTO.email()));
    }

    @Test
    void postOAuth2RegisterDelegatesAndReturnsSession() throws Exception {
        JwtSession session = jwtSession("access-token", "refresh-token", USER_DTO);
        when(authService.postOAuth2Register(any())).thenReturn(session);

        mockMvc.perform(post(BASE_URL + "/register/postOAuth2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "token": "oauth-token",
                                  "username": "player_one"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, session.cookie().toString()))
                .andExpect(jsonPath("$.accessToken").value(session.accessToken()))
                .andExpect(jsonPath("$.user.username").value(USER_DTO.username()));

        verify(authService).postOAuth2Register(any());
    }

    @Test
    void loginPasswordDelegatesAndReturnsSession() throws Exception {
        JwtSession session = jwtSession("access-token", "refresh-token", USER_DTO);
        when(authService.login(any())).thenReturn(session);

        mockMvc.perform(post(BASE_URL + "/login/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "password": "password123",
                                  "username": "player_one"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, session.cookie().toString()))
                .andExpect(jsonPath("$.accessToken").value(session.accessToken()))
                .andExpect(jsonPath("$.user.email").value(USER_DTO.email()));

        verify(authService).login(any());
    }

    @Test
    void postOAuth2LoginDelegatesAndReturnsSession() throws Exception {
        JwtSession session = jwtSession("access-token", "refresh-token", USER_DTO);
        when(authService.postOAuth2Login(any())).thenReturn(session);

        mockMvc.perform(post(BASE_URL + "/login/postOAuth2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "token": "oauth-token"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, session.cookie().toString()))
                .andExpect(jsonPath("$.accessToken").value(session.accessToken()))
                .andExpect(jsonPath("$.user.id").value(USER_DTO.id()));

        verify(authService).postOAuth2Login(any());
    }

    @Test
    void refreshRollsSessionWhenServiceRequestsIt() throws Exception {
        JwtSession session = jwtSession("new-access-token", "new-refresh-token", USER_DTO);
        when(authService.shouldRollSession("old-refresh-token")).thenReturn(true);
        when(authService.extendSession("old-refresh-token")).thenReturn(session);

        mockMvc.perform(post(BASE_URL + "/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refreshToken", "old-refresh-token")))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.SET_COOKIE, session.cookie().toString()))
                .andExpect(jsonPath("$.accessToken").value(session.accessToken()))
                .andExpect(jsonPath("$.user.username").value(USER_DTO.username()));

        verify(authService).shouldRollSession("old-refresh-token");
        verify(authService).extendSession("old-refresh-token");
        verify(authService, never()).refresh(any());
    }

    @Test
    void refreshReusesSessionWhenRollIsNotNeeded() throws Exception {
        RefreshTokenResponse response = new RefreshTokenResponse("access-token", USER_DTO);
        when(authService.shouldRollSession("refresh-token")).thenReturn(false);
        when(authService.refresh("refresh-token")).thenReturn(response);

        mockMvc.perform(post(BASE_URL + "/refresh")
                        .cookie(new jakarta.servlet.http.Cookie("refreshToken", "refresh-token")))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.accessToken").value(response.accessToken()))
                .andExpect(jsonPath("$.user.email").value(USER_DTO.email()));

        verify(authService).shouldRollSession("refresh-token");
        verify(authService).refresh("refresh-token");
        verify(authService, never()).extendSession(any());
    }

    @Test
    void refreshWithoutCookieReturnsUnauthorizedProblemDetail() throws Exception {
        mockMvc.perform(post(BASE_URL + "/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.instance").value(BASE_URL + "/refresh"));

        verifyNoInteractions(authService);
    }

    @Test
    void logoutDeletesSessionAndReturnsExpiredCookie() throws Exception {
        ResponseCookie expiredCookie = ResponseCookie.from("refreshToken", "")
                .path("/")
                .maxAge(0)
                .httpOnly(true)
                .build();
        when(authService.deleteSession("refresh-token")).thenReturn(expiredCookie);

        mockMvc.perform(post(BASE_URL + "/logout")
                        .cookie(new jakarta.servlet.http.Cookie("refreshToken", "refresh-token")))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge("refreshToken", 0))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("Max-Age=0")));

        verify(authService).deleteSession("refresh-token");
    }

    @Test
    void logoutWithoutCookieReturnsBadRequestProblemDetail() throws Exception {
        mockMvc.perform(post(BASE_URL + "/logout"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.instance").value(BASE_URL + "/logout"));

        verifyNoInteractions(authService);
    }

    @Test
    void oauth2LoginResponseUsesRequestOriginInNonDevMode() throws Exception {
        OAuth2LoginResponse response = new OAuth2LoginResponse(OAuth2LoginResponseType.OAUTH2_SUCCESS, "oauth-token");
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("oauth2LoginResponse", response);

        mockMvc.perform(get(BASE_URL + "/login/oauth2/response")
                        .session(session)
                        .with(internalForward())
                        .with(request -> {
                            request.setScheme("https");
                            request.setServerName("api.example.com");
                            request.setServerPort(8443);
                            return request;
                        }))
                .andExpect(status().isOk())
                .andExpect(view().name("OAuth2LoginResponse"))
                .andExpect(model().attribute("oauth2LoginResponse", response))
                .andExpect(model().attribute("origin", "https://api.example.com:8443"));
    }

    @Test
    void oauth2LoginResponseOmitsDefaultPortsFromRequestOrigin() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("oauth2LoginResponse", new OAuth2LoginResponse(OAuth2LoginResponseType.OAUTH2_FAILURE, null));

        mockMvc.perform(get(BASE_URL + "/login/oauth2/response")
                        .session(session)
                        .with(internalForward())
                        .with(request -> {
                            request.setScheme("https");
                            request.setServerName("api.example.com");
                            request.setServerPort(443);
                            return request;
                        }))
                .andExpect(status().isOk())
                .andExpect(model().attribute("origin", "https://api.example.com"));
    }

    @Test
    void invalidRegisterPasswordDoesNotCallService() throws Exception {
        mockMvc.perform(post(BASE_URL + "/register/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "password": "short",
                                  "username": "bad username!",
                                  "email": ""
                                }
                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors").isArray());

        verifyNoInteractions(authService);
    }

    @Test
    void invalidLoginPasswordDoesNotCallService() throws Exception {
        mockMvc.perform(post(BASE_URL + "/login/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "password": null
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors").exists());

        verifyNoInteractions(authService);
    }

    @Test
    void invalidPostOAuth2RegisterDoesNotCallService() throws Exception {
        mockMvc.perform(post(BASE_URL + "/register/postOAuth2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username": "bad username!"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors").exists());

        verifyNoInteractions(authService);
    }

    @Test
    void invalidPostOAuth2LoginDoesNotCallService() throws Exception {
        mockMvc.perform(post(BASE_URL + "/login/postOAuth2")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors").exists());

        verifyNoInteractions(authService);
    }

    private static JwtSession jwtSession(String accessToken, String refreshToken, UserDto userDto) {
        return new JwtSession(
                accessToken,
                ResponseCookie.from("refreshToken", refreshToken)
                        .path("/")
                        .httpOnly(true)
                        .build(),
                userDto
        );
    }

    private static RequestPostProcessor internalForward() {
        return request -> {
            request.setDispatcherType(DispatcherType.FORWARD);
            return request;
        };
    }
}
