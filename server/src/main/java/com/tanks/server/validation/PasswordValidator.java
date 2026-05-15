package com.tanks.server.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

public class PasswordValidator implements ConstraintValidator<ValidPassword,String> {

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        // Let @NotNull handle this null validation
        if(password == null) return true;

        return password.length() >= 8;
    }
}
