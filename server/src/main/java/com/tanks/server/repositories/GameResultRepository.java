package com.tanks.server.repositories;

import com.tanks.server.entities.gameResult.GameResult;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.UUID;

public interface GameResultRepository extends JpaRepository<GameResult, UUID> {

}
