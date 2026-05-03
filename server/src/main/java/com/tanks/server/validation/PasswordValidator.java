package com.tanks.server.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

public class PasswordValidator implements ConstraintValidator<ValidPassword,String> {
    private static Pattern PASSWORD_PATTERN = Pattern.compile("^(?=.*\\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$");

    @Override
    public boolean isValid(String password, ConstraintValidatorContext context) {
        if(password == null) return false;

        return PASSWORD_PATTERN.matcher(password).matches();
    }
}
