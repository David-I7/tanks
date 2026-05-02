package com.tanks.server.config;

import com.tanks.server.utils.IdFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class GameConfig {

    @Bean
    public IdFactory idFactory(){
        return new IdFactory(8);
    }
}
