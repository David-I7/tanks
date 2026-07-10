package com.tanks.server.entities.gameResult;

import com.tanks.server.entities.User;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.UUID;

@Entity
@Builder
@AllArgsConstructor
@NoArgsConstructor
@Getter
@Table(name = "game_results")
public class GameResult {

    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_a_id")
    private User playerA;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "player_b_id")
    private User playerB;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "winner_id")
    private User winner;

    @Enumerated(value = EnumType.STRING)
    @Column(nullable = false)
    private GameOutcome outcome;

    @Column(nullable = false, name = "game_started_at")
    private OffsetDateTime gameStartedAt;

    @Column(nullable = false, name = "game_ended_at")
    private OffsetDateTime gameEndedAt;

    @PrePersist
    protected void prePersist(){
        if(gameEndedAt == null) gameEndedAt = OffsetDateTime.now();
    }
}
