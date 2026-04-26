package com.tanks.server.services;

import com.tanks.server.dao.MatchDao;
import org.springframework.stereotype.Service;

@Service
public class MatchService {

    private MatchDao matchDao;

    public MatchService(MatchDao matchDao){
        this.matchDao = matchDao;
    }


}
