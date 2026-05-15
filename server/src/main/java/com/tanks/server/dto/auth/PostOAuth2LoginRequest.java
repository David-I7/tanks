package com.tanks.server.dto.auth;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PostOAuth2LoginRequest{

    @NotNull
    private String token;

}
