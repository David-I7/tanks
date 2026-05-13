package com.tanks.server.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

public class UsernameValidator implements ConstraintValidator<ValidUsername,String> {
    private static Pattern USERNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_]+$");

    @Override
    public boolean isValid(String username, ConstraintValidatorContext context) {
        if(username == null) return false;

        return USERNAME_PATTERN.matcher(username).matches();
    }
}
