package com.tanks.server.websocket.services;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.context.ApplicationEventPublisher;

import com.tanks.server.repositories.GameResultRepository;
import com.tanks.server.repositories.UserRepository;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffEnvelopeDto;
import com.tanks.server.websocket.dto.gameplay.OnlineDiffPayloads;
import com.tanks.server.websocket.dto.gameplay.OnlineGameplayProtocolVersion;
import com.tanks.server.websocket.dto.gameplay.OnlineMatchSnapshotDto.MatchPhase;
import com.tanks.server.websocket.dto.gameplay.OnlineStateDiffType;
import com.tanks.server.websocket.dto.game.GameEventResponseDto;
import com.tanks.server.websocket.dto.game.GameStartPayload;
import com.tanks.server.websocket.events.GameEvent;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.gameSession.GameSessionState;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.lobby.LobbyStatus;
import com.tanks.server.websocket.entities.lobby.LobbyType;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.gameplay.OnlineGameplayDefinitionCatalog;
import com.tanks.server.websocket.gameplay.OnlineInitialStateFactory;
import com.tanks.server.websocket.gameplay.OnlineGameplayRules;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import com.tanks.server.websocket.repositories.LobbyRepository;

class GameSessionServiceInitialStateTest {

    @Test
    @DisplayName("Starting a created Game Session publishes authoritative Initial State")
    void startGamePublishesInitialState() {
        TestHarness harness = new TestHarness();
        UUID gameSessionId = UUID.randomUUID();
        GameSession gameSession = GameSession.builder()
                .id(gameSessionId)
                .playerA("host")
                .playerB("opponent")
                .state(GameSessionState.CREATED)
                .gameplayDefinitionVersion(harness.gameplayRules.currentVersion())
                .build();

        when(harness.claimService.claimGameStart(gameSessionId)).thenReturn(true);
        when(harness.gameRepository.findById(gameSessionId)).thenReturn(Optional.of(gameSession));
        when(harness.gameRepository.save(any(GameSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        harness.service.startGame(gameSession);

        OnlineDiffEnvelopeDto<?> initialState = harness.events.stream()
                .filter(OnlineGameplayEvent.class::isInstance)
                .map(OnlineGameplayEvent.class::cast)
                .map(OnlineGameplayEvent::getPayload)
                .findFirst()
                .orElseThrow();

        assertThat(initialState.protocolVersion()).isEqualTo(OnlineGameplayProtocolVersion.V1);
        assertThat(initialState.gameSessionId()).isEqualTo(gameSessionId.toString());
        assertThat(initialState.sequence()).isEqualTo(1);
        assertThat(initialState.serverTick()).isZero();
        assertThat(initialState.type()).isEqualTo(OnlineStateDiffType.INITIAL_STATE);
        assertThat(initialState.intentId()).isNull();

        OnlineDiffPayloads.InitialState payload = (OnlineDiffPayloads.InitialState) initialState.payload();
        assertThat(payload.expectedNextDiffSequence()).isEqualTo(2);
        assertThat(payload.localPlayerId()).isEqualTo(1);
        assertThat(payload.state().gameplayDefinitionVersion()).isEqualTo(harness.gameplayRules.currentVersion());
        assertThat(payload.state().match().phase()).isEqualTo(MatchPhase.AIMING);
        assertThat(payload.state().match().activePlayerId()).isEqualTo(1);
        assertThat(payload.state().match().turnNumber()).isEqualTo(1);
        assertThat(payload.state().terrain().width()).isGreaterThan(0);
        assertThat(payload.state().tanks()).hasSize(2);
        assertThat(payload.state().tanks().get(0).displayName()).isEqualTo("host");
        assertThat(payload.state().tanks().get(0).loadout()).extracting("id").containsExactly("standard", "mortar", "heavy", "cluster", "needle");
        assertThat(payload.state().projectiles()).isEmpty();
        assertThat(gameSession.getServerTick()).isZero();
        assertThat(gameSession.getPlayerTurn()).isEqualTo("host");
        assertThat(gameSession.getPlayerTurnExpiresAt()).isEqualTo(ServerSimulationLoopService.TURN_TIMER_TICKS);
        assertThat(gameSession.getTurnNumber()).isEqualTo(1);
        assertThat(gameSession.getNextDiffSequence()).isEqualTo(2);
        assertThat(harness.events.stream()
                .filter(OnlineGameplayEvent.class::isInstance)
                .map(OnlineGameplayEvent.class::cast)
                .map(OnlineGameplayEvent::getUsername))
                .containsExactly("host", "opponent");
        assertThat(harness.events.stream()
                .filter(OnlineGameplayEvent.class::isInstance)
                .map(OnlineGameplayEvent.class::cast)
                .map(OnlineGameplayEvent::getPayload)
                .map(OnlineDiffEnvelopeDto::payload)
                .map(OnlineDiffPayloads.InitialState.class::cast)
                .map(OnlineDiffPayloads.InitialState::localPlayerId))
                .containsExactly(1L, 2L);

        assertThat(harness.events.stream()
                .filter(GameEvent.class::isInstance)
                .map(GameEvent.class::cast)
                .map(event -> (GameEventResponseDto) event.getPayload())
                .map(response -> (GameStartPayload) response.getPayload())
                .map(GameStartPayload::localPlayerId))
                .containsExactly(1L, 2L);
    }

    @Test
    @DisplayName("Creating a Game Session from a ready Lobby can start both players from Initial State")
    void createReadyLobbyCanStartWithInitialState() {
        TestHarness harness = new TestHarness();
        UUID lobbyId = UUID.randomUUID();
        Lobby lobby = Lobby.builder()
                .id(lobbyId)
                .hostId(1L)
                .opponentId(2L)
                .type(LobbyType.PRIVATE)
                .status(LobbyStatus.READY)
                .build();
        UserSession host = UserSession.builder().id(1L).username("host").build();
        UserSession opponent = UserSession.builder().id(2L).username("opponent").build();

        when(harness.claimService.claimGameCreation(lobbyId, 1L)).thenReturn(true);
        when(harness.lobbyRepository.findById(lobbyId)).thenReturn(Optional.of(lobby));
        when(harness.userSessionService.findById(1L)).thenReturn(host);
        when(harness.userSessionService.findById(2L)).thenReturn(opponent);
        when(harness.gameRepository.save(any(GameSession.class))).thenAnswer(invocation -> invocation.getArgument(0));

        GameSession created = harness.service.create(lobby);
        harness.events.clear();

        when(harness.claimService.claimGameStart(created.getId())).thenReturn(true);
        when(harness.gameRepository.findById(created.getId())).thenReturn(Optional.of(created));

        harness.service.startGame(created);

        assertThat(harness.events.stream()
                .filter(OnlineGameplayEvent.class::isInstance)
                .map(OnlineGameplayEvent.class::cast)
                .map(OnlineGameplayEvent::getPayload)
                .map(OnlineDiffEnvelopeDto::type))
                .containsExactly(OnlineStateDiffType.INITIAL_STATE, OnlineStateDiffType.INITIAL_STATE);
    }

    @Test
    @DisplayName("Authorized Game participant can request complete authoritative Resync State")
    void requestResyncStatePublishesCurrentAuthoritativeSnapshot() {
        TestHarness harness = new TestHarness();
        UUID gameSessionId = UUID.randomUUID();
        GameSession gameSession = GameSession.builder()
                .id(gameSessionId)
                .playerA("host")
                .playerB("opponent")
                .playerTurn("opponent")
                .playerTurnExpiresAt(930)
                .serverTick(120)
                .lastDiffServerTick(90)
                .turnNumber(2)
                .nextDiffSequence(8)
                .playerATankX(180.0)
                .playerATankY(396.0)
                .playerATankFuel(75.0)
                .playerATankHealth(80.0)
                .playerBTankX(780.0)
                .playerBTankY(420.0)
                .playerBTankFuel(95.0)
                .playerBTankHealth(94.0)
                .state(GameSessionState.STARTED)
                .gameplayDefinitionVersion(harness.gameplayRules.currentVersion())
                .build();

        when(harness.gameRepository.findById(gameSessionId)).thenReturn(Optional.of(gameSession));

        harness.service.sendResyncStateToPlayer(
                gameSessionId,
                "host",
                OnlineDiffPayloads.ResyncReason.RECONNECT);

        OnlineGameplayEvent event = harness.events.stream()
                .filter(OnlineGameplayEvent.class::isInstance)
                .map(OnlineGameplayEvent.class::cast)
                .findFirst()
                .orElseThrow();
        OnlineDiffEnvelopeDto<?> resync = event.getPayload();

        assertThat(event.getUsername()).isEqualTo("host");
        assertThat(event.getDestination()).isEqualTo("/queue/replies");
        assertThat(resync.protocolVersion()).isEqualTo(OnlineGameplayProtocolVersion.V1);
        assertThat(resync.gameSessionId()).isEqualTo(gameSessionId.toString());
        assertThat(resync.sequence()).isEqualTo(7);
        assertThat(resync.serverTick()).isEqualTo(90);
        assertThat(resync.type()).isEqualTo(OnlineStateDiffType.RESYNC_STATE);
        assertThat(resync.intentId()).isNull();

        OnlineDiffPayloads.ResyncState payload = (OnlineDiffPayloads.ResyncState) resync.payload();
        assertThat(payload.replacesSequence()).isEqualTo(7);
        assertThat(payload.reason()).isEqualTo(OnlineDiffPayloads.ResyncReason.RECONNECT);
        assertThat(payload.localPlayerId()).isEqualTo(1);
        assertThat(payload.state().match().activePlayerId()).isEqualTo(2);
        assertThat(payload.state().match().turnNumber()).isEqualTo(2);
        assertThat(payload.state().match().turnTimeRemainingTicks()).isEqualTo(810);
        assertThat(payload.state().tanks()).hasSize(2);
        assertThat(payload.state().tanks().get(0).position().x()).isEqualTo(180);
        assertThat(payload.state().tanks().get(0).fuel()).isEqualTo(75);
        assertThat(payload.state().tanks().get(1).health()).isEqualTo(94);
        assertThat(gameSession.getNextDiffSequence()).isEqualTo(8);

        harness.events.clear();
        harness.service.sendResyncStateToPlayer(
                gameSessionId,
                "opponent",
                OnlineDiffPayloads.ResyncReason.RECONNECT);

        OnlineGameplayEvent opponentEvent = harness.events.stream()
                .filter(OnlineGameplayEvent.class::isInstance)
                .map(OnlineGameplayEvent.class::cast)
                .findFirst()
                .orElseThrow();
        OnlineDiffPayloads.ResyncState opponentPayload =
                (OnlineDiffPayloads.ResyncState) opponentEvent.getPayload().payload();

        assertThat(opponentEvent.getUsername()).isEqualTo("opponent");
        assertThat(opponentPayload.localPlayerId()).isEqualTo(2);
    }

    @Test
    @DisplayName("Resync requests before authoritative gameplay starts do not replace Initial State")
    void requestResyncBeforeGameStartDoesNotPublishSnapshot() {
        TestHarness harness = new TestHarness();
        UUID gameSessionId = UUID.randomUUID();
        GameSession gameSession = GameSession.builder()
                .id(gameSessionId)
                .playerA("host")
                .playerB("opponent")
                .state(GameSessionState.CREATED)
                .gameplayDefinitionVersion(harness.gameplayRules.currentVersion())
                .build();

        when(harness.gameRepository.findById(gameSessionId)).thenReturn(Optional.of(gameSession));

        boolean sent = harness.service.sendResyncStateToPlayer(
                gameSessionId,
                "host",
                OnlineDiffPayloads.ResyncReason.RECONNECT);

        assertThat(sent).isFalse();
        assertThat(harness.events).isEmpty();
    }

    @Test
    @DisplayName("Creating a Game Session from an unready Lobby is rejected")
    void createRejectsUnreadyLobby() {
        TestHarness harness = new TestHarness();
        UUID lobbyId = UUID.randomUUID();
        Lobby staleLobby = Lobby.builder()
                .id(lobbyId)
                .hostId(1L)
                .type(LobbyType.PRIVATE)
                .status(LobbyStatus.WAITING_FOR_OPPONENT)
                .build();

        when(harness.claimService.claimGameCreation(lobbyId, 1L)).thenReturn(true);
        when(harness.lobbyRepository.findById(lobbyId)).thenReturn(Optional.of(staleLobby));

        assertThatThrownBy(() -> harness.service.create(staleLobby))
                .isInstanceOf(ProblemDetailException.class)
                .hasMessageContaining("Lobby is no longer ready");
    }

    private static class TestHarness {
        private final GameSessionRepository gameRepository = mock(GameSessionRepository.class);
        private final UserSessionService userSessionService = mock(UserSessionService.class);
        private final LobbyRepository lobbyRepository = mock(LobbyRepository.class);
        private final QuickMatchService quickMatchService = mock(QuickMatchService.class);
        private final List<Object> events = new ArrayList<>();
        private final ApplicationEventPublisher eventPublisher = events::add;
        private final ClaimService claimService = mock(ClaimService.class);
        private final GameResultRepository gameResultRepository = mock(GameResultRepository.class);
        private final UserRepository userRepository = mock(UserRepository.class);
        private final OnlineGameplayRules gameplayRules = new OnlineGameplayRules(new OnlineGameplayDefinitionCatalog());
        private final OnlineInitialStateFactory initialStateFactory = new OnlineInitialStateFactory(gameplayRules);
        private final GameSessionService service = new GameSessionService(
                gameRepository,
                userSessionService,
                lobbyRepository,
                quickMatchService,
                eventPublisher,
                claimService,
                gameplayRules,
                initialStateFactory,
                gameResultRepository,
                userRepository,
                new KeyLockManager());
    }
}
