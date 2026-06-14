package com.tanks.server.controllers;

import com.tanks.server.config.SecurityConfig;
import com.tanks.server.security.filters.JwtAuthenticationFilter;
import com.tanks.server.security.oauth.OAuth2SuccessHandler;
import com.tanks.server.services.AuthService;
import com.tanks.server.utils.ProblemDetailWriter;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.boot.webmvc.test.autoconfigure.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.security.web.authentication.AuthenticationFailureHandler;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AuthController.class)
@AutoConfigureMockMvc(addFilters = true)
@Import({SecurityConfig.class, JwtAuthenticationFilter.class})
@TestPropertySource(properties = {
        "app.isDev=false",
        "app.client.origin=http://localhost:3000"
})
class AuthControllerSecurityTest {

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
    void directOauth2LoginResponseRequestIsForbiddenBySecurityConfig() throws Exception {
        mockMvc.perform(get("/api/v1/auth/login/oauth2/response"))
                .andExpect(status().isForbidden());
    }
}
