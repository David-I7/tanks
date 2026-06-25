package com.tanks.server.controllers;

import com.tanks.server.dto.UserDto;
import com.tanks.server.dto.auth.*;
import com.tanks.server.security.services.JwtService;
import com.tanks.server.security.services.JwtSessionService;
import com.tanks.server.services.UserService;
import jakarta.servlet.DispatcherType;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.TestInstance;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.testcontainers.service.connection.ServiceConnection;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.RequestPostProcessor;
import org.springframework.transaction.annotation.Transactional;
import org.testcontainers.postgresql.PostgreSQLContainer;
import org.testcontainers.junit.jupiter.Container;
import org.testcontainers.junit.jupiter.Testcontainers;
import tools.jackson.databind.ObjectMapper;

import java.util.HashMap;
import java.util.Map;

import static org.hamcrest.Matchers.nullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.cookie;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.model;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@Testcontainers
@TestInstance(TestInstance.Lifecycle.PER_CLASS)
class AuthControllerTest {

    private long OAUTH2_SUCCESS_TOKEN_EXPIRATION_DURATION_MS = 1000l * 60 * 2; // 2 minutes

    private long OAUTH2_PARTIAL_TOKEN_EXPIRATION_DURATION_MS = 1000l * 60 * 10; // 10 minutes

    private static final String BASE_URL = "/api/v1/auth";

    private static Map<String, Map<Long,TestUserCache>> testCache = new HashMap<>();

    @Value("${app.isDev}")
    private boolean isDev;

    @Value("${app.client.origin}")
    private String clientOrigin;

    @Autowired
    private JwtSessionService jwtSessionService;

    @Autowired
    private JwtService jwtService;

    @Autowired
    private UserService userService;

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @ServiceConnection
    @Container
    private static final PostgreSQLContainer postgresSQLContainer =
            new PostgreSQLContainer("postgres:18-alpine3.23")
                    .withDatabaseName("prod")
                    .withUsername("david")
                    .withPassword("david");

    @BeforeAll
    public void beforeAll() throws Exception {

        var registerRequest = new LoginRequest("12345678","tt2",null);
        var res = mockMvc.perform(post(BASE_URL + "/login/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)));

        var response = res.andReturn().getResponse();
        var refreshTokenResponse = objectMapper.readValue(response.getContentAsString(), RefreshTokenResponse.class);

        var users =testCache.computeIfAbsent("users",(k) -> new HashMap<>());
        users.put(refreshTokenResponse.user().id(), new TestUserCache(refreshTokenResponse.accessToken(), response.getCookie("refreshToken"), refreshTokenResponse.user()));

        users.put(1L,new TestUserCache(null,null,new UserDto(1L,"tt1","test@gmail.com")));
    }

    @Test
    @DisplayName("""
            Given: authenticated user
            When: status endpoint is called
            Then: authenticated principal is returned
            """)
    void status1() throws Exception {
        var testUserCache = testCache.get("users").get(2L);
        var userDto = testUserCache.user();

        mockMvc.perform(post(BASE_URL + "/status")
                        .cookie(testUserCache.refreshCookie())
                        .header(HttpHeaders.AUTHORIZATION, "Bearer " + testUserCache.accessToken())
                )
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.user.id").value(userDto.id()))
                .andExpect(jsonPath("$.user.username").value(userDto.username()))
                .andExpect(jsonPath("$.user.email").value(userDto.email()))
                .andExpect(jsonPath("$.userSessionStatus").value(nullValue()));
    }

    @Test
    @DisplayName("""
            Given: unauthenticated user
            When: status endpoint is called
            Then: 401 Unauthorized is returned
            """)
    void status2() throws Exception {
        var res = mockMvc.perform(post(BASE_URL + "/status"));

        res .andExpect(status().isUnauthorized())
            .andExpect(jsonPath("$.status").value(401))
            .andExpect(jsonPath("$.instance").value(BASE_URL + "/status"))
            .andExpect(jsonPath("$.detail").value("Missing or invalid authorization header"))
            .andExpect(jsonPath("$.title").value("401 UNAUTHORIZED"))
            .andExpect(jsonPath("$.type").value("about:blank"));
    }


    @Test
    @DisplayName("""
            Given: unauthenticated user
            When: /register/password endpoint is called with a valid RegisterRequest
            Then: 201 created is returned
            """)
    @Transactional
    void registerPassword1() throws Exception {

        var registerRequest = new RegisterRequest("12345678","tt3","test3@gmail.com");


        var response = mockMvc.perform(post(BASE_URL + "/register/password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(registerRequest)));

        response
                .andExpect(status().isCreated())
                .andExpect(cookie().exists("refreshToken"))
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.user.id").exists())
                .andExpect(jsonPath("$.user.username").value(registerRequest.getUsername()))
                .andExpect(jsonPath("$.user.email").value(registerRequest.getEmail()));
    }

    @Test
    @DisplayName("""
            Given: unauthenticated user
            When: /register/password endpoint is called with a invalid password
            Then: 400 bad request is returned
            """)
    void registerPassword2() throws Exception {

        var registerRequest1 = new RegisterRequest("1234567","tt3","test3@gmail.com");
        var registerRequest2 = new RegisterRequest(null,"tt3","test3@gmail.com");

        var response1 = mockMvc.perform(post(BASE_URL + "/register/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest1)));

        var response2 = mockMvc.perform(post(BASE_URL + "/register/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest2)));

        response1
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors").isArray());

        response2
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors").isArray());
    }

    @Test
    @DisplayName("""
            Given: unauthenticated user
            When: /register/password endpoint is called with a invalid username
            Then: 400 bad request is returned
            """)
    public void registerPassword3() throws Exception {

        var registerRequest = new RegisterRequest("1234567","tt","test3@gmail.com");

        var response = mockMvc.perform(post(BASE_URL + "/register/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)));

        response
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors").isArray());
    }

    @Test
    @DisplayName("""
            Given: unauthenticated user
            When: /register/password endpoint is called with an already registered username
            Then: 409 conflict is returned
            """)
    public void registerPassword4() throws Exception {

        var registerRequest = new RegisterRequest("12345678","tt1","test@gmail.com");

        var response = mockMvc.perform(post(BASE_URL + "/register/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)));

        response
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Username and email are already taken"));
    }

    @Test
    @DisplayName("""
            Given: unauthenticated user
            When: /register/password endpoint is called with a invalid email
            Then: 400 bad request is returned
            """)
    public void registerPassword5() throws Exception {

        var registerRequest = new RegisterRequest("12345678","tt3","test3gmail.com");

        var response = mockMvc.perform(post(BASE_URL + "/register/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)));

        response
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.errors").isArray());
    }

    @Test
    @DisplayName("""
            Given: unauthenticated user
            When: /register/password endpoint is called with an already registered email
            Then: 409 conflict is returned
            """)
    public void registerPassword6() throws Exception {

        var registerRequest = new RegisterRequest("12345678","tt3","test@gmail.com");

        var response = mockMvc.perform(post(BASE_URL + "/register/password")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(registerRequest)));

        response
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Email is taken"));
    }

    @Test
    @DisplayName("""
            Given: existent user
            When: /login/postOAuth2 endpoint is called with a valid token
            Then: 200 OK is returned
            """)
    @Transactional
    public void postoauth2login1() throws Exception {
        var existingUser = testCache.get("users").get(1L).user();
        String token = jwtService.generateToken(existingUser.email(), Map.of(),OAUTH2_SUCCESS_TOKEN_EXPIRATION_DURATION_MS);

        var PostOAuth2LoginRequest = new PostOAuth2LoginRequest(token);

        var response =  mockMvc.perform(post(BASE_URL + "/login/postOAuth2")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(PostOAuth2LoginRequest))
        );

        response.andExpect(status().isOk())
                .andExpect(cookie().exists("refreshToken"))
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.user.id").value(existingUser.id()))
                .andExpect(jsonPath("$.user.username").value(existingUser.username()))
                .andExpect(jsonPath("$.user.email").value(existingUser.email()));

    }

    @Test
    @DisplayName("""
            Given: non-existent user
            When: /login/postOAuth2 endpoint is called with an invalid token
            Then: 401 Unauthorized is returned
            """)
    @Transactional
    public void postoauth2login2() throws Exception {
        String token = jwtService.generateToken("", Map.of(),OAUTH2_SUCCESS_TOKEN_EXPIRATION_DURATION_MS);

        var postOAuth2LoginRequest = new PostOAuth2LoginRequest(token);

        var response =  mockMvc.perform(post(BASE_URL + "/login/postOAuth2")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(postOAuth2LoginRequest))
        );

        response.andExpect(status().isUnauthorized());
    }

    @Test
    @DisplayName("""
            Given: new user
            When: /login/postOAuth2 endpoint is called with a valid token
            Then: 201 CREATED is returned
            """)
    @Transactional
    public void postoauth2register1() throws Exception {
        var newUserEmail = "test3@gmail.com";
        var newUserUsername = "tt3";

        String token = jwtService.generateToken(newUserEmail, Map.of(),OAUTH2_PARTIAL_TOKEN_EXPIRATION_DURATION_MS);

        var postOAuth2RegisterRequest = new PostOAuth2RegisterRequest(token, newUserUsername);

        var response =  mockMvc.perform(post(BASE_URL + "/register/postOAuth2")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(postOAuth2RegisterRequest))
        );

        response.andExpect(status().isCreated())
                .andExpect(cookie().exists("refreshToken"))
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.user.id").exists())
                .andExpect(jsonPath("$.user.username").value(newUserUsername))
                .andExpect(jsonPath("$.user.email").value(newUserEmail));
    }

    @Test
    @DisplayName("""
            Given: new user
            When: /login/postOAuth2 endpoint is called with a valid token and already taken username
            Then: 409 CONFLICT is returned
            """)
    @Transactional
    public void postoauth2register2() throws Exception {
        var user = testCache.get("users").get(1L).user();
        String token = jwtService.generateToken("test3@gmail.com", Map.of(),OAUTH2_PARTIAL_TOKEN_EXPIRATION_DURATION_MS);

        var postOAuth2RegisterRequest = new PostOAuth2RegisterRequest(token,user.username());

        var response =  mockMvc.perform(post(BASE_URL + "/register/postOAuth2")
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(postOAuth2RegisterRequest))
        );

        response.andExpect(status().isConflict())
                .andExpect(jsonPath("$.detail").value("Username is taken"));
    }

    @Test
    @DisplayName("""
            Given: refresh cookie is valid
            When: /refresh handler is invoked
            Then: it should return a new access token
            """)
    void refreshReusesSessionWhenRollIsNotNeeded() throws Exception {
        var testUserCache = testCache.get("users").get(2L);

        mockMvc.perform(post(BASE_URL + "/refresh")
                        .cookie(testUserCache.refreshCookie))
                .andExpect(status().isOk())
                .andExpect(header().doesNotExist(HttpHeaders.SET_COOKIE))
                .andExpect(jsonPath("$.accessToken").exists())
                .andExpect(jsonPath("$.user.id").value(testUserCache.user().id()))
                .andExpect(jsonPath("$.user.email").value(testUserCache.user().email()))
                .andExpect(jsonPath("$.user.username").value(testUserCache.user().username()));
    }

    @Test
    @DisplayName("""
            Given: refresh cookie is not present or invalid
            When: /refresh handler is invoked
            Then: it should return a unauthorized response
            """)
    void refresh2() throws Exception {
        mockMvc.perform(post(BASE_URL + "/refresh"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.status").value(401))
                .andExpect(jsonPath("$.instance").value(BASE_URL + "/refresh"));
    }

    @Test
    @Transactional
    @DisplayName("""
            Given: user is authenticated
            When: /logout handler is invoked
            Then: it should expire the refresh token cookie
            """)
    void logout1() throws Exception {
        var testUserCache = testCache.get("users").get(2L);

        mockMvc.perform(post(BASE_URL + "/logout")
                        .cookie(testUserCache.refreshCookie()))
                .andExpect(status().isOk())
                .andExpect(cookie().maxAge("refreshToken", 0))
                .andExpect(header().string(HttpHeaders.SET_COOKIE, org.hamcrest.Matchers.containsString("Max-Age=0")));
    }

    @Test
    @DisplayName("""
            Given: user is not authenticated
            When: /logout handler is invoked
            Then: it should return a bad request problem detail
            """)
    void logout2() throws Exception {
        mockMvc.perform(post(BASE_URL + "/logout"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.instance").value(BASE_URL + "/logout"));
    }

    @Test
    @DisplayName("""
            Given: user completed oauth2login flow
            When: /login/oauth2/response handler is invoked
            Then: it should set the oauth2loginresponse and origin in the model
            """)
    void oauth2LoginResponse() throws Exception {
        MockHttpSession session = new MockHttpSession();
        var oauth2LoginResponse = new OAuth2LoginResponse(OAuth2LoginResponseType.OAUTH2_SUCCESS, "token");
        session.setAttribute("oauth2LoginResponse", oauth2LoginResponse);

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
                .andExpect(model().attribute("origin", isDev ? clientOrigin : "https://api.example.com"))
                .andExpect(model().attribute("oauth2LoginResponse", oauth2LoginResponse));
    }


    private static RequestPostProcessor internalForward() {
                return request -> {
                        request.setDispatcherType(DispatcherType.FORWARD);
                        return request;
                    };
    }

    private record TestUserCache(String accessToken, Cookie refreshCookie, UserDto user){}
}
