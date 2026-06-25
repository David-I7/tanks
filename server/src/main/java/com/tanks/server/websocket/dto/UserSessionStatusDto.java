package com.tanks.server.websocket.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.tanks.server.websocket.entities.userSession.UserSessionState;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class UserSessionStatusDto {

    private UserSessionState state;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private UUID lobbyId;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private UUID gameId;

}

