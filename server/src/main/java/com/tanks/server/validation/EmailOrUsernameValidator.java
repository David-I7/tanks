package com.tanks.server.validation;

import com.tanks.server.dto.auth.LoginRequest;
import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

public class EmailOrUsernameValidator implements ConstraintValidator<EmailOrUsernameRequired, LoginRequest> {
    @Override
    public boolean isValid(LoginRequest value, ConstraintValidatorContext constraintValidatorContext) {
        if (value == null) {return false;}

        return value.getEmail() != null || value.getUsername() != null;
    }
}
