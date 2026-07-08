import Logout from "../../components/auth/Logout";
import Button from "../../components/buttons/Button";
import H1 from "../../components/headings/H1";
import Surface from "../../components/layouts/Surface";
import { useScreenStack } from "../../context/ScreenStack";
import { useAuthStore } from "../../store/useAuthStore";
import type { HomeScreenStack } from "./HomePage";

export default function RootScreen() {
    const { pushScreen } = useScreenStack<HomeScreenStack>();
    const user = useAuthStore(state => state.user);

    return (
        <Surface className="px-8 py-8 w-full max-w-sm flex flex-col gap-5 text-center">
            <H1 className="text-center py-2">Tanks!</H1>
            <Button onClick={() => pushScreen("onlineMenu")} color="primary">
                Online Mode
            </Button>
            <Button onClick={() => pushScreen("offlineMenu")} color="secondary">
                Offline Mode
            </Button>
            {user &&
                <Logout
                    color="secondary"
                    variant="outline"
                    onSuccess={() => console.log("Logged out")}
                    onFailure={console.error}
                />
            }
        </Surface>
    );
}
