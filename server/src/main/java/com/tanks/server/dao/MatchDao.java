package com.tanks.server.dao;

import com.tanks.server.model.GameState;
import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

@Component
public class MatchDao {
    private final ConcurrentHashMap<String, GameState> activeMatches = new ConcurrentHashMap<>();

    public void save(String matchId, GameState initialState) {
        activeMatches.put(matchId, initialState);
    }

    public GameState findById(String matchId){
        return activeMatches.get(matchId);
    }

    public void removeById(String matchId){
        activeMatches.remove(matchId);
    }
}
