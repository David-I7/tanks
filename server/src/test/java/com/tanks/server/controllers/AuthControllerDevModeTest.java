package com.tanks.server.controllers;

import com.tanks.server.config.SecurityConfig;
import com.tanks.server.dto.auth.OAuth2LoginResponse;
import com.tanks.server.dto.auth.OAuth2LoginResponseType;
import com.tanks.server.security.filters.JwtAuthenticationFilter;
import com.tanks.server.security.oauth.OAuth2SuccessHandler;
import com.tanks.server.services.AuthService;
import com.tanks.server.utils.ProblemDetailWriter;
import jakarta.servlet.DispatcherType;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.view;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = {
        "app.isDev=true",
        "app.client.origin=http://localhost:3000"
})
class AuthControllerDevModeTest {

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
    void oauth2LoginResponseUsesConfiguredClientOriginInDevMode() throws Exception {
        MockHttpSession session = new MockHttpSession();
        session.setAttribute("oauth2LoginResponse", new OAuth2LoginResponse(OAuth2LoginResponseType.OAUTH2_PARTIAL, "oauth-token"));

        mockMvc.perform(get("/api/v1/auth/login/oauth2/response")
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
                .andExpect(model().attribute("origin", "http://localhost:3000"));
    }

    private static RequestPostProcessor internalForward() {
        return request -> {
            request.setDispatcherType(DispatcherType.FORWARD);
            return request;
        };
    }
}
