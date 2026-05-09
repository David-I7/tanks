package com.tanks.server.exceptions;

import com.tanks.server.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import lombok.AllArgsConstructor;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.MissingRequestCookieException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.net.URI;

@RestControllerAdvice
@Order(0)
public class GlobalExceptionHandler {

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<ProblemDetail> handleValidationException(HttpServletRequest request, MethodArgumentNotValidException e){
        ProblemDetail problemDetail = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
        problemDetail.setInstance(URI.create(request.getServletPath()));
        problemDetail.setType(URI.create("about:blank"));
        problemDetail.setTitle(HttpStatus.BAD_REQUEST.toString());
        problemDetail.setProperty("errors",e.getAllErrors());

        return ResponseEntity.status(problemDetail.getStatus()).body(problemDetail);
    }

    @ExceptionHandler(MissingRequestCookieException.class)

    public ResponseEntity<ProblemDetail> handleMissingRefreshTokenException(HttpServletRequest request, MissingRequestCookieException e){
        ProblemDetail problemDetail;

        if(request.getServletPath().startsWith("/api/v1/auth/refresh")){
            problemDetail=ProblemDetail.forStatus(HttpStatus.UNAUTHORIZED);
            problemDetail.setTitle(HttpStatus.UNAUTHORIZED.toString());
        }else{
            problemDetail = ProblemDetail.forStatus(HttpStatus.BAD_REQUEST);
            problemDetail.setTitle(HttpStatus.BAD_REQUEST.toString());
        }

        problemDetail.setInstance(URI.create(request.getServletPath()));
        problemDetail.setType(URI.create("about:blank"));
        problemDetail.setDetail(e.getBody().getDetail());

        return ResponseEntity.status(problemDetail.getStatus()).body(problemDetail);
    }

}
