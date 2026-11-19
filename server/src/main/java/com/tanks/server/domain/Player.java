package com.tanks.server.domain;

import java.util.UUID;

public record Player(UUID id, String nickname, String tankId) {
}
