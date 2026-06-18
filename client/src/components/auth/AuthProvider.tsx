import type { ReactNode } from "react";
import { useAuthStore } from "../../store/useAuthStore";

export default function AuthProvider({ children }: { children: ReactNode }) {
    const handleRefresh = useAuthStore(state => state.handleRefresh);

    try {
        handleRefresh();
    } catch (err) {

    }

    return children;
}