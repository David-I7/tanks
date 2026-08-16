import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "../store/useAuthStore";
import type { UserSessionStatus } from "../api/http/dto/AuthStatusResponseDto";

export function useUserStatusQuery() {
  const user = useAuthStore((state) => state.user);
  const status = useAuthStore((state) => state.status);

  return useQuery({
    queryKey: ["userStatus", user?.id],
    queryFn: async (): Promise<UserSessionStatus | null> => {
      return await status().then((res) => res.userSessionStatus);
    },
    enabled: user !== null,
    staleTime: Infinity, // 10 minutes
  });
}
