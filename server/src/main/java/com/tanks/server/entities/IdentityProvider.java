package com.tanks.server.entities;

public enum IdentityProvider {
    LOCAL, GOOGLE;

    public static IdentityProvider fromString(String provider) {
            for(IdentityProvider providerEnum : IdentityProvider.values()){
                if(providerEnum.name().equals(provider.toUpperCase())){
                    return providerEnum;
                }
            }

            return null;
    }
}
