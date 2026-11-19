package com.tanks.server.validation;

import jakarta.validation.ConstraintValidator;
import jakarta.validation.ConstraintValidatorContext;

import java.util.regex.Pattern;

public class NicknameValidator implements ConstraintValidator<ValidNickname, String> {
    private static final Pattern NICKNAME_PATTERN = Pattern.compile("^[a-zA-Z0-9_]+$");

    @Override
    public boolean isValid(String nickname, ConstraintValidatorContext context) {
        if (nickname == null) {
            return true;
        }

        return NICKNAME_PATTERN.matcher(nickname).matches();
    }
}
