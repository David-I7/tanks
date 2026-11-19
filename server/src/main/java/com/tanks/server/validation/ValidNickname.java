package com.tanks.server.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = NicknameValidator.class)
@Target({ElementType.FIELD, ElementType.PARAMETER, ElementType.RECORD_COMPONENT})
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidNickname {

    String message() default "Nickname must only include uppercase, lowercase, digit, and underscore characters.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
