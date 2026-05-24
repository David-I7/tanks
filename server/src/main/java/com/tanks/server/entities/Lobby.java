package com.tanks.server.entities;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.util.UUID;

@Entity
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Setter
@Table(name = "lobbies")
public class Lobby {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Enumerated(value = EnumType.STRING)
    @Column(nullable = false)
    private Type type;

    @Enumerated(value = EnumType.STRING)
    @Column(nullable = false)
    private Status status;

    @OneToOne
    @JoinColumn(name = "host_id")
    private User host;

    @OneToOne
    @JoinColumn(name = "opponent_id")
    private User opponent;

    @PrePersist
    protected void prePersist(){
        if(status == null) status = Status.WAITING;
    }

    public static enum Type{
        PRIVATE, QUICK_MATCH
    }

    public static enum Status{
        WAITING,READY,IN_GAME
    }
}

