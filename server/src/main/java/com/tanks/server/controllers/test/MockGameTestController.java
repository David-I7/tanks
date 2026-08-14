package com.tanks.server.controllers.test;

import com.tanks.server.dto.test.MockGameSetupResponseDto;
import com.tanks.server.dto.test.MockPlayer;
import com.tanks.server.entities.User;
import com.tanks.server.repositories.UserRepository;
import com.tanks.server.security.services.JwtService;
import com.tanks.server.security.services.JwtSessionService;
import com.tanks.server.utils.IdFactory;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyPlayerConfig;
import com.tanks.server.websocket.entities.lobby.LobbyStatus;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import com.tanks.server.websocket.repositories.LobbyRepository;
import com.tanks.server.websocket.services.ClaimService;
import com.tanks.server.websocket.services.GameSessionService;
import com.tanks.server.websocket.services.UserSessionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/v1/test/mock-game")
@RequiredArgsConstructor
@Slf4j
public class MockGameTestController {

    private final UserRepository userRepository;
    private final UserSessionService userSessionService;
    private final JwtService jwtService;
    private final PasswordEncoder passwordEncoder;
    private final GameSessionRepository gameSessionRepository;
    private final ClaimService claimService;

    @DeleteMapping("/cleanup-game")
    public ResponseEntity<Void> cleanupMockGame(@RequestParam String gameSessionId) {
        log.debug("Cleaning up mock game {}", gameSessionId);
        gameSessionRepository.deleteById(UUID.fromString(gameSessionId));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/create")
    public ResponseEntity<MockGameSetupResponseDto> createMockGame(@RequestParam int playerCount) {

        List<MockPlayer> players = new ArrayList<>();

        for(int i = 0; i < playerCount; i++){
            var username = "tt" + (i + 1);
            var email = "test" + (i + 1) + "@gmail.com";
            User user = getOrCreateUser(username, email);
            claimService.forceReleaseUserSocket(user.getId());
            createUserSession(user);
            players.add(MockPlayer.builder()
                    .username(username)
                    .accessToken(jwtService.generateAccessToken(user.getId().toString(), Map.of("username", user.getUsername(), "email", user.getEmail())))
                    .id(user.getId())
                    .build());
        }

        return ResponseEntity.ok(new MockGameSetupResponseDto(players));
    }


    private User getOrCreateUser(String username, String email) {
        return userRepository.findByUsername(username)
                .orElseGet(() -> userRepository.save(User.builder()
                        .username(username)
                        .email(email)
                        .password(passwordEncoder.encode("12345678"))
                        .build()));
    }

    private UserSession createUserSession(User user) {
        UserSession newSession = UserSession.builder()
                .id(user.getId())
                .username(user.getUsername())
                .state(UserSessionState.IDLE)
                .build();
        return userSessionService.save(newSession);
    }
}
