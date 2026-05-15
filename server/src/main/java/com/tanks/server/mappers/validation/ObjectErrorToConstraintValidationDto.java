package com.tanks.server.mappers.validation;

import com.tanks.server.dto.validation.ConstraintValidationDto;
import com.tanks.server.dto.validation.ConstraintValidationType;
import org.springframework.validation.FieldError;
import org.springframework.validation.ObjectError;

import java.util.function.Function;

public class ObjectErrorToConstraintValidationDto implements Function<ObjectError, ConstraintValidationDto> {
    @Override
    public ConstraintValidationDto apply(ObjectError error) {
        if (error instanceof FieldError fieldError) {
            return new ConstraintValidationDto(
                    ConstraintValidationType.FIELD,
                    fieldError.getObjectName(),
                    fieldError.getField(),
                    fieldError.getDefaultMessage()
            );
        } else {
            return new ConstraintValidationDto(
                    ConstraintValidationType.OBJECT,
                    error.getObjectName(),
                    null,
                    error.getDefaultMessage()
            );
        }
    }

}
