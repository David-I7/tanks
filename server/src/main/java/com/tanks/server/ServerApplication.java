package com.tanks.server;

import com.tanks.server.websocket.entities.gameSession.GameSession;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;
import org.springframework.data.redis.core.RedisOperations;
import org.springframework.data.redis.core.RedisTemplate;
import org.springframework.data.redis.core.SessionCallback;

import java.util.List;


@SpringBootApplication
public class ServerApplication {

	public static void main(String[] args) {
SpringApplication.run(ServerApplication.class, args);
	}

	@Bean
	CommandLineRunner commandLineRunner(RedisTemplate<String,Object> redisTemplate){
		return (args)->{
//			var res = redisTemplate.execute(new SessionCallback<List<Object>>() {
//				@Override
//				public <K, V> List<Object> execute(RedisOperations<K, V> operations) {
//					operations.multi();
//
//					RedisOperations<String, Object> redis =
//							(RedisOperations<String, Object>) operations;
//
//					redis.opsForHash().put("gameSession:1", "connectedPlayerCount", 1L);
//					redis.opsForHash().increment("gameSession:1", "connectedPlayerCount", 1L);
//					redis.opsForHash().entries("gameSession:1");
//
//					return redis.exec();
//				}
//			});
//
//			System.out.println(res);
		};
	}

}
