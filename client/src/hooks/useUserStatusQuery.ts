import { useQuery } from "@tanstack/react-query";
import TanksClient from "../api/http/TanksClient";
import AuthStatusRequest from "../api/http/requests/auth/AuthStatusRequest";
import { useAuthStore } from "../store/useAuthStore";
import type { UserSessionStatus } from "../api/http/dto/AuthStatusResponseDto";

const tanksClient = new TanksClient();

export function useUserStatusQuery() {
  const user = useAuthStore((state) => state.user);

  return useQuery({
    queryKey: ["userStatus", user?.id],
    queryFn: async (): Promise<UserSessionStatus> => {
      const response = await tanksClient.send(new AuthStatusRequest());
      // Keep store updated with latest user / userStatus for sync accesses
      useAuthStore.setState({
        user: response.user,
        userStatus: response.userSessionStatus,
      });
      return response.userSessionStatus;
    },
    enabled: user !== null,
    staleTime: 10_000,
  });
}
