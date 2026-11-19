package com.tanks.server.websocket.gameplay.content.terrain;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = Crater.class, name = "CRATER"),
    @JsonSubTypes.Type(value = Drill.class, name = "DRILL")
})
public sealed interface TerrainEffect permits Crater, Drill {
}
