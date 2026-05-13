package com.tanks.server.validation;

import jakarta.validation.Constraint;
import jakarta.validation.Payload;

import java.lang.annotation.*;

@Documented
@Constraint(validatedBy = UsernameValidator.class)
@Target(ElementType.FIELD)
@Retention(RetentionPolicy.RUNTIME)
public @interface ValidUsername {

    String message() default "Username must only include uppercase, lowercase, digit, and underscore characters.";

    Class<?>[] groups() default {};

    Class<? extends Payload>[] payload() default {};
}
