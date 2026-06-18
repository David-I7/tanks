import { useState } from "react";

export default function useClipboard(timeoutMs: number = 2000) {
    const [copied, setCopied] = useState<boolean>(false);

    const copyText = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), timeoutMs);
    };

    return { copied, copyText };
}