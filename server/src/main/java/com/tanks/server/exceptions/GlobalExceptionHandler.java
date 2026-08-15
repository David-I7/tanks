package com.tanks.server.exceptions;

import com.tanks.server.dto.validation.ConstraintValidationDto;
import com.tanks.server.mappers.validation.ObjectErrorToConstraintValidationDto;
import jakarta.servlet.http.HttpServletRequest;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestCookieException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.util.List;

@RestControllerAdvice
@Order(0)
@Slf4j
public class GlobalExceptionHandler {

    private ObjectErrorToConstraintValidationDto constraintValidationDtoMapper = new ObjectErrorToConstraintValidationDto();

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidationException(HttpServletRequest request,
            MethodArgumentNotValidException e) {
        ProblemDetail problemDetail = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problemDetail.setInstance(URI.create(request.getRequestURI()));
        problemDetail.setType(URI.create("about:blank"));
        problemDetail.setTitle(HttpStatus.BAD_REQUEST.toString());

        List<ConstraintValidationDto> validationDtos = e.getAllErrors().stream()
                .map(objectError -> constraintValidationDtoMapper.apply(objectError))
                .toList();

        problemDetail.setProperty("errors", validationDtos);

        return ResponseEntity.status(problemDetail.getStatus()).body(problemDetail);
    }

    @ExceptionHandler(MissingRequestCookieException.class)
    public ResponseEntity<ProblemDetail> handleMissingRefreshTokenException(HttpServletRequest request,
            MissingRequestCookieException e) {
        ProblemDetail problemDetail;

        if (request.getRequestURI().startsWith("/api/v1/auth/refresh")) {
            problemDetail = ProblemDetail.forStatus(HttpStatus.UNAUTHORIZED);
            problemDetail.setTitle(HttpStatus.UNAUTHORIZED.getReasonPhrase());
        } else {
            problemDetail = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
            problemDetail.setTitle(HttpStatus.BAD_REQUEST.getReasonPhrase());
        }

        problemDetail.setInstance(URI.create(request.getRequestURI()));
        problemDetail.setType(URI.create("about:blank"));
        problemDetail.setDetail(e.getBody().getDetail());

        return ResponseEntity.status(problemDetail.getStatus()).body(problemDetail);
    }

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<ProblemDetail> handleResponseStatusExceptions(HttpServletRequest request,
                                                                        ResponseStatusException e) {
        return ResponseEntity.status(e.getStatusCode()).body(e.getBody());
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<ProblemDetail> handleCatchall(Exception ex) {
        ProblemDetail problemDetail = ProblemDetail.forStatus(HttpStatus.INTERNAL_SERVER_ERROR);
        problemDetail.setTitle(HttpStatus.INTERNAL_SERVER_ERROR.getReasonPhrase());
        problemDetail.setType(URI.create("about:blank"));

        log.error("Unhandled exception", ex);

        return ResponseEntity.status(problemDetail.getStatus()).body(problemDetail);
    }

}
