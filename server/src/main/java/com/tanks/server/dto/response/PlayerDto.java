package com.tanks.server.dto.response;

import java.util.UUID;

public record PlayerDto(UUID id, String nickname) {
}
