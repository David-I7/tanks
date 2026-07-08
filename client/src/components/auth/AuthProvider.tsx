import { useEffect } from "react";
import type { ReactNode } from "react";
import { useAuthStore } from "../../store/useAuthStore";

export default function AuthProvider({ children }: { children: ReactNode }) {
    const handleRefresh = useAuthStore(state => state.handleRefresh);

    useEffect(() => {
        void handleRefresh().catch(() => {
            // Authentication state is already updated by the store.
        });
    }, [handleRefresh]);

    return children;
}
