package com.tanks.server.websocket.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = ChatMessageRequestDtoValidator.class)
@Target(ElementType.TYPE)
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidChatMessageRequestDto {

    String message() default "Invalid chat message";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
