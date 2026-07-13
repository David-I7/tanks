package com.tanks.server.websocket.dto.gameplay;

import static org.assertj.core.api.Assertions.assertThat;
import java.util.List;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import tools.jackson.databind.ObjectMapper;
import com.tanks.server.websocket.gameplay.content.GameContentCatalog;

class OnlineGameplayProtocolContractTest {
    private final ObjectMapper mapper = new ObjectMapper();

    @Test void requestNamesRetainTheExistingWireShape() {
        var request = new OnlinePlayerIntentRequestDto<>(OnlineGameplayProtocolVersion.V1, "game", 1, "intent", 7, 210,
                OnlinePlayerIntentRequestType.MOVE, new OnlinePlayerIntentRequestPayloads.Move(1));
        var json = mapper.valueToTree(request);
        assertThat(json.at("/type").asText()).isEqualTo("MOVE");
        assertThat(json.at("/payload/direction").asInt()).isEqualTo(1);
        assertThat(json.at("/payload").size()).isEqualTo(1);
    }

    @Test void responseMovementCarriesPathPartialStatusAndIntegerFuel() {
        var path = List.of(new OnlineVec2Dto(10, 20), new OnlineVec2Dto(11, 19));
        var response = new OnlineDiffResponseDto<>(OnlineGameplayProtocolVersion.V1, "game", 2, 6,
                OnlineStateDiffResponseType.MOVEMENT_SEGMENT, "intent",
                new OnlineDiffResponsePayloads.MovementSegment("intent", 1, 10, path.getFirst(), path.getLast(), path,
                        100, 98, 2, true, 0, 6, 6));
        var json = mapper.valueToTree(response);
        assertThat(json.at("/payload/movementPath").size()).isEqualTo(2);
        assertThat(json.at("/payload/fuelAfter").isIntegralNumber()).isTrue();
        assertThat(json.at("/payload/partial").asBoolean()).isTrue();
    }

    @Test void stateResponseCarriesCompleteGameContentAndHeightmapOnly() {
        var content = new GameContentCatalog().current();
        var state = new OnlineGameStateSnapshotResponseDto(content.version(), GameContentResponseDto.from(content),
                new OnlineMatchSnapshotResponseDto(OnlineMatchSnapshotResponseDto.MatchPhase.AIMING, 1, 2, 1, 900, null),
                new OnlineTerrainSnapshotResponseDto.Heightmap(OnlineTerrainSnapshotResponseDto.TerrainSnapshotKind.HEIGHTMAP,
                        4, 3, List.of(2, 2, 1, 2)), List.of(), List.of());
        var json = mapper.valueToTree(state);
        assertThat(json.at("/gameContentVersion").asText()).isEqualTo("game-content.v1");
        assertThat(json.at("/gameContent/world/bedrockDepth").asInt()).isPositive();
        assertThat(json.at("/terrain/kind").asText()).isEqualTo("HEIGHTMAP");
        assertThat(OnlineTerrainSnapshotResponseDto.class.getPermittedSubclasses()).hasSize(1);
        assertThat(OnlineTerrainPatchResponseDto.class.getPermittedSubclasses()).hasSize(1);
    }

    @Test void sharedClientExamplesMatchServerRequestAndMovementSerialization() throws Exception {
        var shared = mapper.readTree(Path.of("..", "docs", "contracts", "online-gameplay-protocol-examples.json").toFile());
        var request = new OnlinePlayerIntentRequestDto<>(OnlineGameplayProtocolVersion.V1, "game-123", 1,
                "intent-abc", 7, 210, OnlinePlayerIntentRequestType.FIRE,
                new OnlinePlayerIntentRequestPayloads.Fire(42, .75, "standard"));
        var path = List.of(new OnlineVec2Dto(50, 120), new OnlineVec2Dto(55, 120));
        var movement = new OnlineDiffResponseDto<>(OnlineGameplayProtocolVersion.V1, "game-123", 3, 60,
                OnlineStateDiffResponseType.MOVEMENT_SEGMENT, "intent-move",
                new OnlineDiffResponsePayloads.MovementSegment("intent-move", 1, 10, path.getFirst(), path.getLast(),
                        path, 100, 95, 5, false, 60, 75, 15));
        tools.jackson.databind.JsonNode requestJson = mapper.valueToTree(request);
        tools.jackson.databind.JsonNode movementJson = mapper.valueToTree(movement);
        assertThat(requestJson.toString()).isEqualTo(shared.get("playerIntent").toString());
        assertThat(movementJson.toString()).isEqualTo(shared.get("diffs").get(2).toString());
    }
}
