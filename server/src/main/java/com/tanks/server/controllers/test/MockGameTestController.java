package com.tanks.server.controllers.test;

import com.tanks.server.dto.test.MockGameSetupResponseDto;
import com.tanks.server.entities.User;
import com.tanks.server.repositories.UserRepository;
import com.tanks.server.security.services.JwtSessionService;
import com.tanks.server.utils.IdFactory;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyPlayerConfig;
import com.tanks.server.websocket.entities.lobby.LobbyStatus;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import com.tanks.server.websocket.repositories.LobbyRepository;
import com.tanks.server.websocket.services.GameSessionService;
import com.tanks.server.websocket.services.UserSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.UUID;

@RestController
@RequestMapping("/api/v1/test/mock-game")
@RequiredArgsConstructor
public class MockGameTestController {

    private final UserRepository userRepository;
    private final UserSessionService userSessionService;
    private final LobbyRepository lobbyRepository;
    private final GameSessionService gameSessionService;
    private final JwtSessionService jwtSessionService;

    @PostMapping("/start")
    public ResponseEntity<MockGameSetupResponseDto> startMockGame() {
        User userA = getOrCreateUser("test_player_a", "player_a@test.com");
        User userB = getOrCreateUser("test_player_b", "player_b@test.com");

        UserSession sessionA = getOrCreateUserSession(userA);
        UserSession sessionB = getOrCreateUserSession(userB);

        UUID lobbyId = IdFactory.randomUUID();
        Lobby lobby = Lobby.builder()
                .id(lobbyId)
                .host(LobbyPlayerConfig.builder()
                        .id(sessionA.getId())
                        .username(sessionA.getUsername())
                        .tankDefinitionId("standard")
                        .build())
                .opponent(LobbyPlayerConfig.builder()
                        .id(sessionB.getId())
                        .username(sessionB.getUsername())
                        .tankDefinitionId("standard")
                        .build())
                .type(LobbyType.PRIVATE)
                .status(LobbyStatus.READY)
                .build();

        lobbyRepository.save(lobby);

        GameSession gameSession = gameSessionService.create(lobby);
        gameSessionService.startGame(gameSession);

        String tokenA = jwtSessionService.createSession(userA).accessToken();
        String tokenB = jwtSessionService.createSession(userB).accessToken();

        MockGameSetupResponseDto response = MockGameSetupResponseDto.builder()
                .gameSessionId(gameSession.getId())
                .playerAToken(tokenA)
                .playerBToken(tokenB)
                .playerAUsername(userA.getUsername())
                .playerBUsername(userB.getUsername())
                .playerAId(1L)
                .playerBId(2L)
                .activePlayerId(gameSession.getWorld().match().activePlayerId())
                .build();

        return ResponseEntity.ok(response);
    }

    private User getOrCreateUser(String username, String email) {
        return userRepository.findByUsername(username)
                .orElseGet(() -> userRepository.save(User.builder()
                        .username(username)
                        .email(email)
                        .password("Password123!")
                        .build()));
    }

    private UserSession getOrCreateUserSession(User user) {
        try {
            return userSessionService.findById(user.getId());
        } catch (Exception e) {
            UserSession newSession = UserSession.builder()
                    .id(user.getId())
                    .username(user.getUsername())
                    .state(UserSessionState.IDLE)
                    .build();
            return userSessionService.save(newSession);
        }
    }
}
