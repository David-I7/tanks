package com.tanks.server.websocket.gameplay.content;

import java.io.InputStream;
import java.util.Collections;
import java.util.HashMap;
import java.util.Map;
import org.springframework.core.io.Resource;
import org.springframework.core.io.support.PathMatchingResourcePatternResolver;
import org.springframework.stereotype.Component;
import jakarta.annotation.PostConstruct;
import tools.jackson.databind.ObjectMapper;

@Component
public class GameContentCatalog {
    private final ObjectMapper objectMapper;
    private Map<String, GameContent> versions = Collections.emptyMap();
    private GameContent current;

    public GameContentCatalog(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    @PostConstruct
    public void init() {
        try {
            PathMatchingResourcePatternResolver resolver = new PathMatchingResourcePatternResolver();
            Resource[] resources = resolver.getResources("classpath*:content/game-content-*.json");
            Map<String, GameContent> map = new HashMap<>();
            for (Resource resource : resources) {
                try (InputStream is = resource.getInputStream()) {
                    GameContent content = objectMapper.readValue(is, GameContent.class);
                    map.put(content.version(), content);
                }
            }
            this.versions = Map.copyOf(map);
            this.current = versions.get("v1.0");
            if (this.current == null) {
                throw new IllegalStateException("Required game content version 'v1.0' not found in classpath:content/");
            }
        } catch (Exception e) {
            throw new IllegalStateException("Failed to load game content definitions from JSON", e);
        }
    }

    public GameContent current() {
        if (current == null) {
            init();
        }
        return current;
    }

    public GameContent require(String version) {
        if (versions.isEmpty()) {
            init();
        }
        GameContent content = versions.get(version);
        if (content == null) throw new IllegalArgumentException("Unknown Game Content Version: " + version);
        return content;
    }
}
