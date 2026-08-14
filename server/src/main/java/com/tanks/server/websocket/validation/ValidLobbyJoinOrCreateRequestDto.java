package com.tanks.server.websocket.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = LobbyJoinOrCreateRequestDtoValidator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidLobbyJoinOrCreateRequestDto {

    String message() default "Invalid lobby join or create request";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}