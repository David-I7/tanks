package com.tanks.server.dto.auth;

import com.tanks.server.validation.ValidUsername;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class PostOAuth2RegisterRequest {

    @NotNull
    private String token;

    @ValidUsername
    @NotNull
    private String username;

}
