import { useState } from "react";

function getOrSetToLocalStorage<Value>(key: string, initialValue: Value | null): Value | null {
    try {
        const storedValue = localStorage.getItem(key);
        if (storedValue !== null) return JSON.parse(storedValue) as Value;
        else {
            localStorage.setItem(key, JSON.stringify(initialValue));
            return initialValue;
        }
    } catch (error) {
        localStorage.setItem(key, JSON.stringify(initialValue));
        return initialValue;
    }
}

export default function useLocalStroage<Value extends NonNullable<unknown>>(key: string, initialValue: Value | null = null) {
    const [value, setValue] = useState<Value | null>(() => getOrSetToLocalStorage(key, initialValue));

    const setItem = (value: Value) => {
        setValue(value);
        localStorage.setItem(key, JSON.stringify(value));
    };

    const removeItem = () => {
        setValue(null);
        localStorage.removeItem(key);
    }

    return { value, setItem, removeItem } as const;
}   