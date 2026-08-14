package com.tanks.server.dto.test;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class MockGameSetupResponseDto {
    private List<MockPlayer> players;

    public String getPlayerAToken() {
        return (players != null && !players.isEmpty()) ? players.get(0).getAccessToken() : null;
    }

    public String getPlayerBToken() {
        return (players != null && players.size() > 1) ? players.get(1).getAccessToken() : null;
    }

    public String getPlayerCToken() {
        return (players != null && players.size() > 2) ? players.get(2).getAccessToken() : null;
    }

    public String getPlayerAUsername() {
        return (players != null && !players.isEmpty()) ? players.get(0).getUsername() : null;
    }

    public String getPlayerBUsername() {
        return (players != null && players.size() > 1) ? players.get(1).getUsername() : null;
    }

    public String getPlayerCUsername() {
        return (players != null && players.size() > 2) ? players.get(2).getUsername() : null;
    }

    public Long getPlayerAId() {
        return (players != null && !players.isEmpty()) ? players.get(0).getId() : null;
    }

    public Long getPlayerBId() {
        return (players != null && players.size() > 1) ? players.get(1).getId() : null;
    }

    public Long getPlayerCId() {
        return (players != null && players.size() > 2) ? players.get(2).getId() : null;
    }
}
