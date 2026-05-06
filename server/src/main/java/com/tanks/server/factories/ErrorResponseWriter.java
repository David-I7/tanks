package com.tanks.server.factories;

import com.tanks.server.dto.ErrorResponse;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.time.Instant;

@Component
@AllArgsConstructor
public class ErrorResponseWriter {

    private ObjectMapper objectMapper;

    public void write(HttpServletRequest request,
                                    HttpServletResponse response,
                                    int status,
                                    String message) throws IOException {

        ErrorResponse errorResponse = new ErrorResponse(
                Instant.now().toString(),
                status,
                message,
                request.getRequestURI()
        );

        response.setStatus(status);
        response.setContentType(MediaType.APPLICATION_JSON_VALUE);

        objectMapper.writeValue(response.getWriter(), errorResponse);
    }

}
