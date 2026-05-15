package com.tanks.server.dto.validation;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ConstraintValidationDto {

    private ConstraintValidationType type;

    private String objectName;

    @JsonInclude(JsonInclude.Include.NON_NULL)
    private String field;

    private String message;

}
