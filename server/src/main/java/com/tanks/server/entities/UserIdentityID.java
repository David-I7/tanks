package com.tanks.server.entities;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.io.Serializable;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Embeddable
public class UserIdentityID implements Serializable {

    @Enumerated(value = EnumType.STRING)
    private IdentityProvider provider;

    @Column(name = "provider_user_id")
    private String providerUserId;

}
