package com.tanks.server.websocket.gameplay;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestDto;
import com.tanks.server.websocket.dto.gameplay.playerIntent.OnlinePlayerIntentRequestType;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.AimIntentRequestPayload;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.FireIntentIntentRequestPayload;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.MoveIntentRequestPayload;
import com.tanks.server.websocket.dto.gameplay.playerIntent.payloads.SelectProjectileIntentRequestPayload;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;

public class OnlinePlayerIntentSerializationTest {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Test
    public void shouldDeserializeMoveIntentPolymorphically() throws Exception {
        String json = """
                {
                    "gameSessionId": "test-session-1",
                    "playerId": 1,
                    "intentId": "intent-move-1",
                    "lastConfirmedDiffSequence": 1,
                    "lastConfirmedDiffServerTick": 0,
                    "type": "MOVE",
                    "payload": {
                        "direction": 1
                    }
                }
                """;

        OnlinePlayerIntentRequestDto<?> dto = objectMapper.readValue(json, new TypeReference<OnlinePlayerIntentRequestDto<?>>() {});

        assertNotNull(dto);
        assertEquals("test-session-1", dto.gameSessionId());
        assertEquals(1L, dto.playerId());
        assertEquals("intent-move-1", dto.intentId());
        assertEquals(OnlinePlayerIntentRequestType.MOVE, dto.type());
        assertInstanceOf(MoveIntentRequestPayload.class, dto.payload());
        MoveIntentRequestPayload payload = (MoveIntentRequestPayload) dto.payload();
        assertEquals(1, payload.direction());
    }

    @Test
    public void shouldDeserializeAimIntentPolymorphically() throws Exception {
        String json = """
                {
                    "gameSessionId": "test-session-1",
                    "playerId": 1,
                    "intentId": "intent-aim-1",
                    "lastConfirmedDiffSequence": 2,
                    "lastConfirmedDiffServerTick": 10,
                    "type": "AIM",
                    "payload": {
                        "angle": -0.785,
                        "power": 300.0
                    }
                }
                """;

        OnlinePlayerIntentRequestDto<?> dto = objectMapper.readValue(json, new TypeReference<OnlinePlayerIntentRequestDto<?>>() {});

        assertNotNull(dto);
        assertEquals(OnlinePlayerIntentRequestType.AIM, dto.type());
        assertInstanceOf(AimIntentRequestPayload.class, dto.payload());
        AimIntentRequestPayload payload = (AimIntentRequestPayload) dto.payload();
        assertEquals(-0.785, payload.angle(), 1e-6);
        assertEquals(300.0, payload.power(), 1e-6);
    }

    @Test
    public void shouldDeserializeSelectProjectileIntentPolymorphically() throws Exception {
        String json = """
                {
                    "gameSessionId": "test-session-1",
                    "playerId": 1,
                    "intentId": "intent-select-1",
                    "lastConfirmedDiffSequence": 2,
                    "lastConfirmedDiffServerTick": 10,
                    "type": "SELECT_PROJECTILE_SLOT",
                    "payload": {
                        "slot": 2
                    }
                }
                """;

        OnlinePlayerIntentRequestDto<?> dto = objectMapper.readValue(json, new TypeReference<OnlinePlayerIntentRequestDto<?>>() {});

        assertNotNull(dto);
        assertEquals(OnlinePlayerIntentRequestType.SELECT_PROJECTILE_SLOT, dto.type());
        assertInstanceOf(SelectProjectileIntentRequestPayload.class, dto.payload());
        SelectProjectileIntentRequestPayload payload = (SelectProjectileIntentRequestPayload) dto.payload();
        assertEquals(2, payload.slot());
    }

    @Test
    public void shouldDeserializeFireIntentPolymorphically() throws Exception {
        String json = """
                {
                    "gameSessionId": "test-session-1",
                    "playerId": 1,
                    "intentId": "intent-fire-1",
                    "lastConfirmedDiffSequence": 3,
                    "lastConfirmedDiffServerTick": 20,
                    "type": "FIRE",
                    "payload": {
                        "angle": -1.57,
                        "power": 450.0
                    }
                }
                """;

        OnlinePlayerIntentRequestDto<?> dto = objectMapper.readValue(json, new TypeReference<OnlinePlayerIntentRequestDto<?>>() {});

        assertNotNull(dto);
        assertEquals(OnlinePlayerIntentRequestType.FIRE, dto.type());
        assertInstanceOf(FireIntentIntentRequestPayload.class, dto.payload());
        FireIntentIntentRequestPayload payload = (FireIntentIntentRequestPayload) dto.payload();
        assertEquals(-1.57, payload.angle(), 1e-6);
        assertEquals(450.0, payload.power(), 1e-6);
    }
}
