package com.tanks.server.websocket.services;


import com.tanks.server.websocket.dto.UserSessionStatusDto;
import com.tanks.server.websocket.entities.gameSession.GameSession;
import com.tanks.server.websocket.entities.lobby.Lobby;
import com.tanks.server.websocket.entities.userSession.UserSession;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import com.tanks.server.websocket.exceptions.ProblemDetailException;
import com.tanks.server.websocket.repositories.GameSessionRepository;
import com.tanks.server.websocket.repositories.LobbyRepository;
import com.tanks.server.websocket.repositories.UserSessionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserSessionService {

    private final UserSessionRepository userSessionRepository;
    private final LobbyRepository lobbyRepository;
    private final GameSessionRepository gameSessionRepository;

    public UserSession save(UserSession userSession){
        return userSessionRepository.save(userSession);
    }

    public UserSession findById(long id){
        return userSessionRepository.findById(id).orElseThrow(() -> new ProblemDetailException(HttpStatus.NOT_FOUND, "The user session with the provided id does not exist.", URI.create("about:blank")));
    }

    public void delete(UserSession userSession){
        userSessionRepository.delete(userSession);
    }

    public boolean isIdle(UserSession userSession){
        return userSession.getState() == UserSessionState.IDLE;
    }

    public boolean isInGame(UserSession userSession, String gameId){
        return userSession.getState() == UserSessionState.IN_GAME && userSession.getGameSessionId().toString().equals(gameId);
    }

    public boolean isInLobby(UserSession userSession, String lobbyId){
        return userSession.getState() == UserSessionState.IN_LOBBY && userSession.getLobbyId().toString().equals(lobbyId);
    }

    public boolean isConnectedToLobby(UserSession userSession){
        if(userSession.getState() != UserSessionState.IN_LOBBY) return false;
        Map<String, String> topics = userSession.getTopicSubscriptions();
        return topics != null && topics.containsKey("/topic/lobby/" + userSession.getLobbyId());
    }

    public boolean isConnectedToGame(UserSession userSession){
        if(userSession.getState() != UserSessionState.IN_GAME) return false;
        Map<String, String> topics = userSession.getTopicSubscriptions();
        return topics != null && topics.containsKey("/topic/game/" + userSession.getGameSessionId());
    }

    public void transitionToLobby(UserSession userSession, UUID lobbyId) {
        userSession.setState(UserSessionState.IN_LOBBY);
        userSession.setLobbyId(lobbyId);
    }

    public void transitionToGame(UserSession userSession, UUID uuid) {
        userSession.setState(UserSessionState.IN_GAME);
        userSession.setGameSessionId(uuid);
        var subscriptions =  userSession.getTopicSubscriptions();
        subscriptions.remove("/topic/lobby/" + userSession.getLobbyId());
        if (subscriptions.isEmpty()){
            userSession.setTopicSubscriptions(null);
        }
        userSession.setLobbyId(null);
    }

    public void transitionToIdle(UserSession userSession) {
        userSession.setState(UserSessionState.IDLE);
        userSession.setLobbyId(null);
        userSession.setGameSessionId(null);
        userSession.setTopicSubscriptions(null);
    }

    public UserSessionStatusDto getUserSessionStatus(Long userId){
        try{
            UserSession userSession = findById(userId);

            UserSessionStatusDto userSessionStatusDto = new UserSessionStatusDto();

            userSessionStatusDto.setState(userSession.getState());

            if(userSession.getState() == UserSessionState.IN_LOBBY){
                Optional<Lobby> lobby = liveLobbySession(userSession);
                if (lobby.isPresent()) {
                    userSessionStatusDto.setLobbyId(userSession.getLobbyId());
                    userSessionStatusDto.setLobbyHostId(lobby.get().getHostId());
                    userSessionStatusDto.setLobbyPlayerCount(lobbyPlayerCount(lobby.get()));
                } else {
                    return resetMissingLiveState(userSession);
                }
            }else if(userSession.getState() == UserSessionState.IN_GAME){
                if (isLiveGameSession(userSession)) {
                    userSessionStatusDto.setGameId(userSession.getGameSessionId());
                } else {
                    return resetMissingLiveState(userSession);
                }
            }

            return userSessionStatusDto;
        }catch (ProblemDetailException e){
            return null;
        }
    }

    private Optional<Lobby> liveLobbySession(UserSession userSession) {
        if (userSession.getLobbyId() == null) return Optional.empty();

        Optional<Lobby> lobby = lobbyRepository.findById(userSession.getLobbyId());
        return lobby
                .filter(value -> userSession.getId().equals(value.getHostId())
                        || userSession.getId().equals(value.getOpponentId()));
    }

    private boolean isLiveGameSession(UserSession userSession) {
        if (userSession.getGameSessionId() == null) return false;

        Optional<GameSession> gameSession = gameSessionRepository.findById(userSession.getGameSessionId());
        return gameSession
                .map(value -> userSession.getUsername().equals(value.getPlayerA())
                        || userSession.getUsername().equals(value.getPlayerB()))
                .orElse(false);
    }

    private UserSessionStatusDto resetMissingLiveState(UserSession userSession) {
        transitionToIdle(userSession);
        save(userSession);
        UserSessionStatusDto status = new UserSessionStatusDto();
        status.setState(UserSessionState.IDLE);
        return status;
    }

    private int lobbyPlayerCount(Lobby lobby) {
        int count = 0;
        if (lobby.getHostId() != null) count++;
        if (lobby.getOpponentId() != null) count++;
        return count;
    }

}
