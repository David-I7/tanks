import { useState } from "react";

function getOrSetToSessionStorage<Value>(key: string, initialValue: Value | null): Value | null {
    try {
        const storedValue = sessionStorage.getItem(key);
        if (storedValue !== null) return JSON.parse(storedValue) as Value;
        else {
            sessionStorage.setItem(key, JSON.stringify(initialValue));
            return initialValue;
        }
    } catch (error) {
        sessionStorage.setItem(key, JSON.stringify(initialValue));
        return initialValue;
    }
}

export default function useSessionStorage<Value extends NonNullable<unknown>>(key: string, initialValue: Value | null = null) {
    const [value, setValue] = useState<Value | null>(() => getOrSetToSessionStorage(key, initialValue));

    const setItem = (value: Value) => {
        setValue(value);
        sessionStorage.setItem(key, JSON.stringify(value));
    };

    const removeItem = () => {
        setValue(null);
        sessionStorage.removeItem(key);
    }

    return { value, setItem, removeItem } as const;
}   