package com.tanks.server.dto;

public record ErrorResponse(
        String timestamp,
        int status,
        String error,
        String path
) {}