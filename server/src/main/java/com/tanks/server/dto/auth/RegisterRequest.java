package com.tanks.server.dto.auth;

import com.tanks.server.validation.ValidPassword;
import com.tanks.server.validation.ValidUsername;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @ValidPassword
    @NotNull
    private final String password;

    @Size(min = 3,message = "Username must be at least 3 characters long")
    @ValidUsername
    private final String username;

    @Email
    @NotBlank
    private final String email;
}
