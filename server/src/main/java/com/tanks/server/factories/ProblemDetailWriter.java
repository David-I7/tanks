package com.tanks.server.factories;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.AllArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.stereotype.Component;
import tools.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.net.URI;

@Component
@AllArgsConstructor
public class ProblemDetailWriter {

    private ObjectMapper objectMapper;

    public void write(HttpServletRequest request,
                                    HttpServletResponse response,
                                    HttpStatus status,
                                    String detail) throws IOException {

        ProblemDetail problemDetail = ProblemDetail.forStatus(status);
        problemDetail.setTitle(status.toString());
        problemDetail.setDetail(detail);
        problemDetail.setType(URI.create("about:blank"));
        problemDetail.setInstance(URI.create(request.getServletPath()));

        response.setStatus(status.value());
        response.setContentType(MediaType.APPLICATION_PROBLEM_JSON_VALUE);

        objectMapper.writeValue(response.getWriter(), problemDetail);
    }

}
