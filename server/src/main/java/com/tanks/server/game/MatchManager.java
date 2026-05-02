package com.tanks.server.game;

import org.springframework.stereotype.Component;
import java.util.HashMap;

@Component
public class MatchManager {
    private final HashMap<String, Match> activeMatches = new HashMap<>();

    public void save(String matchId, Match initialState) {
        activeMatches.put(matchId, initialState);
    }

    public Match findById(String matchId){
        return activeMatches.get(matchId);
    }

    public void removeById(String matchId){
        activeMatches.remove(matchId);
    }
}
