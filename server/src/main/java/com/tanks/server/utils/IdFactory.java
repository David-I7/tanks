package com.tanks.server.utils;

import com.tanks.server.exceptions.InvalidArgumentException;

import java.util.Random;
import java.util.UUID;

public class IdFactory {
    private final Random random = new Random();
    private final int ALPHA_NUM_CHAR_COUNT = 62;
    private final int len;

    public IdFactory(int len){
        if (len <= 0) throw new InvalidArgumentException("Argument 'len' must be a positive integer");
        this.len = len;
    }

    public UUID randomUUID(){
        return UUID.randomUUID();
    }

    public  String randomAlphaNumID(){
        char[] str = new char[len];
        for(int i = 0; i < len; ++i){
            int n = random.nextInt(ALPHA_NUM_CHAR_COUNT);

            // 0-9 map to integers
            if (n < 10){
                str[i] = (char)('0' + n);
            } else if (n < 36) {
                // 10-35 map to lowercase characters
                n-=10;
                str[i] = (char)('a' + n);
            }else{
                // 36-61 map to uppercase characters
                n-=36;
                str[i] = (char)('A' + n);
            }
        }

        return new String(str);
    }
}
