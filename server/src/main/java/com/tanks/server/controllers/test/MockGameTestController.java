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

    @PostMapping("/create")
    public ResponseEntity<MockGameSetupResponseDto> createMockGame() {
        User userA = getOrCreateUser("tt1", "test@gmail.com");
        User userB = getOrCreateUser("tt2", "test2@gmail.com");
        User userC = getOrCreateUser("tt3", "test3@gmail.com");

        UserSession sessionA = getOrCreateUserSession(userA);
        UserSession sessionB = getOrCreateUserSession(userB);
        UserSession sessionC = getOrCreateUserSession(userC);

        resetUserSession(sessionA);
        resetUserSession(sessionB);
        resetUserSession(sessionC);

        String tokenA = jwtSessionService.createSession(userA).accessToken();
        String tokenB = jwtSessionService.createSession(userB).accessToken();
        String tokenC = jwtSessionService.createSession(userC).accessToken();

        MockGameSetupResponseDto response = MockGameSetupResponseDto.builder()
                .playerAToken(tokenA)
                .playerBToken(tokenB)
                .playerCToken(tokenC)
                .playerAUsername(userA.getUsername())
                .playerBUsername(userB.getUsername())
                .playerCUsername(userC.getUsername())
                .playerAId(userA.getId())
                .playerBId(userB.getId())
                .playerCId(userC.getId())
                .build();

        return ResponseEntity.ok(response);
    }

    private void resetUserSession(UserSession session) {
        if (session.getLobbyId() != null) {
            try {
                lobbyRepository.findById(session.getLobbyId()).ifPresent(lobbyRepository::delete);
            } catch (Exception ignored) {
            }
        }
        session.setState(UserSessionState.IDLE);
        session.setLobbyId(null);
        session.setGameSessionId(null);
        session.setTopicSubscriptions(null);
        userSessionService.save(session);
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
