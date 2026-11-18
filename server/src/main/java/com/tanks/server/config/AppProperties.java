package com.tanks.server.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app")
public class AppProperties {
    private enum Environment {
        DEV, PROD, STAGING
    }

    private String clientOrigin;

    private String origin;

    private Environment environment;

    public boolean isDev(){
        return environment == Environment.DEV;
    }

    public boolean isProd(){
        return environment == Environment.PROD;
    }

    public boolean isStaging(){
        return environment == Environment.STAGING;
    }

}
