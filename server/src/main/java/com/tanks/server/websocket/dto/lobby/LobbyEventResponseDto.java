package com.tanks.server.websocket.dto.lobby;


import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;


@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LobbyEventResponseDto {

    private LobbyEventType type;

    private String sender;

    private Object payload;

}