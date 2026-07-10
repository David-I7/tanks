import { ArrowLeft } from "lucide-react";
import Button from "../../components/buttons/Button";
import IconButton from "../../components/buttons/IconButton";
import H1 from "../../components/headings/H1";
import Surface from "../../components/layouts/Surface";
import { useScreenStack } from "../../context/ScreenStack";
import { useNavigate } from "react-router-dom";

export default function OfflineMenu() {
    const { popScreen } = useScreenStack();
    const navigate = useNavigate();
    return (
        <Surface className="px-8 py-8 w-full max-w-sm flex flex-col gap-5 text-center relative pt-14">
            <div className="absolute top-4 left-4">
                <IconButton onClick={() => popScreen()} icon={<ArrowLeft size={16} />} />
            </div>
            <H1 className="text-center mb-2">Offline</H1>
            <Button color="primary" onClick={() => navigate("/test", { state: { mode: "playerVsAi" } })}>Player vs AI</Button>
            <Button color="secondary" onClick={() => navigate("/test", { state: { mode: "localTwoPlayer" } })}>Local Two-Player</Button>
        </Surface>
    );
}
