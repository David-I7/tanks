package com.tanks.server.websocket.dto.game;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@AllArgsConstructor
@NoArgsConstructor
@Builder
@Data
public class GameEventResponseDto {

        private GameEventType type;

        private String sender;

        private Object payload;
}
