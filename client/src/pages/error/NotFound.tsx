import { useNavigate } from "react-router-dom";
import H1 from "../../components/headings/H1";
import Button from "../../components/buttons/Button";

export default function NotFound({ path }: { path: string }) {
  const navigate = useNavigate();

  return (
    <div>
      <H1>Page Not Found</H1>
      <p>The requested path "{path}" was not found.</p>
      <Button color="primary" onClick={() => navigate("/")}>
        Home
      </Button>
    </div>
  );
}
