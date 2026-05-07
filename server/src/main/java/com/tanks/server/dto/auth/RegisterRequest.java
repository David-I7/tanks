package com.tanks.server.dto.auth;

import com.tanks.server.validation.ValidPassword;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RegisterRequest {

    @ValidPassword(message = "Password must be at least 8 characters long and include uppercase, lowercase, and a digit character")
    private String password;

    @Size(min = 3,message = "Username must be at least 3 characters long")
    @NotBlank
    private String username;

    @Email
    @NotBlank
    private String email;

}
