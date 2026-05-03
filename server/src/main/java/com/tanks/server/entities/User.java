package com.tanks.server.entities;

import jakarta.persistence.*;
import lombok.*;

import java.time.OffsetDateTime;

@Entity
@Table(name = "users")
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true,nullable = false)
    private String username;

    @Column(nullable = false)
    private String password;

    @Column(name = "created_at",nullable = false,updatable = false)
    private OffsetDateTime createdAt;

    @PrePersist
    protected void prePersist(){
        if(createdAt == null){
            createdAt = OffsetDateTime.now();
        }
    }
}
