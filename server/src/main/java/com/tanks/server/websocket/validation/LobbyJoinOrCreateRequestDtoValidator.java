package com.tanks.server.websocket.validation;

import com.tanks.server.websocket.dto.lobby.LobbyJoinOrCreateRequestDto;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class LobbyJoinOrCreateRequestDtoValidator implements ConstraintValidator<ValidLobbyJoinOrCreateRequestDto, LobbyJoinOrCreateRequestDto> {
    @Override
    public boolean isValid(LobbyJoinOrCreateRequestDto dto, ConstraintValidatorContext context) {
        if (dto == null) return false;

        if(dto.tankId() == null || dto.tankId().isBlank())
            return false;

        return true;
    }
}
