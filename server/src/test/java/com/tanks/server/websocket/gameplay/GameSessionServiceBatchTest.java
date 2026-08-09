package com.tanks.server.websocket.gameplay;

import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineDiffBatchResponseDto;
import com.tanks.server.websocket.dto.gameplay.diffResponse.OnlineStateDiffResponseType;
import com.tanks.server.websocket.events.OnlineGameplayEvent;
import com.tanks.server.websocket.services.GameSessionService;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

public class GameSessionServiceBatchTest {

    @Test
    public void testOnlineDiffBatchResponseDtoStructure() {
        OnlineDiffBatchResponseDto batch = OnlineDiffBatchResponseDto.builder()
                .gameSessionId("session-1")
                .sequence(10)
                .serverTick(300)
                .intentId("intent-fire-1")
                .build();

        assertEquals("session-1", batch.getGameSessionId());
        assertEquals(10, batch.getSequence());
        assertEquals(300, batch.getServerTick());
        assertEquals("intent-fire-1", batch.getIntentId());
    }
}
