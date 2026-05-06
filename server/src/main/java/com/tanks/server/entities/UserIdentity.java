package com.tanks.server.entities;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "user_identities")
@Builder
@Getter
@Setter
@AllArgsConstructor
@NoArgsConstructor
public class UserIdentity {

    @EmbeddedId
    private UserIdentityID userIdentityID;

    @ManyToOne
    @JoinColumn(name = "user_id")
    private User user;

}

