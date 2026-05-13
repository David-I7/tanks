package com.tanks.server.utils;

import java.util.Random;
import java.util.UUID;

public class IdFactory {
    private static final Random random = new Random();
    private static final int ALPHA_NUM_CHAR_COUNT = 62;
    private static final int LEN = 8;

    public static UUID randomUUID(){
        return UUID.randomUUID();
    }

    public static String randomAlphaNumID(){
        char[] str = new char[LEN];
        for(int i = 0; i < LEN; ++i){
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
