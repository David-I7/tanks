package com.tanks.server.websocket.gameplay.world;

public enum CrateType {
    HP("hp"),
    FUEL("fuel"),
    AMMO("ammo");

    private final String value;

    CrateType(String value) {
        this.value = value;
    }

    public String getValue() {
        return value;
    }

    public static CrateType fromString(String text) {
        if (text == null) return HP;
        for (CrateType b : CrateType.values()) {
            if (b.value.equalsIgnoreCase(text)) {
                return b;
            }
        }
        return HP;
    }
}
