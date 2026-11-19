package com.tanks.server.websocket.gameplay.content.damage;

import com.fasterxml.jackson.annotation.JsonSubTypes;
import com.fasterxml.jackson.annotation.JsonTypeInfo;

@JsonTypeInfo(use = JsonTypeInfo.Id.NAME, property = "type")
@JsonSubTypes({
    @JsonSubTypes.Type(value = Radial.class, name = "RADIAL"),
    @JsonSubTypes.Type(value = Focused.class, name = "FOCUSED")
})
public sealed interface DamageEffect permits Radial, Focused {
    double radius();
    double damage();
}
