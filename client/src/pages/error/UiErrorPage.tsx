import { useNavigate } from "react-router-dom";
import type UiError from "../../errors/UiError";
import Button from "../../components/buttons/Button";

export default function UiErrorPage({ error }: { error: UiError }) {
  const navigate = useNavigate();

  return (
    <div>
      <h1>{error.message}</h1>
      <p>{error.details.description}</p>
      {error.details.action && (
        <Button
          color="primary"
          onClick={() => navigate(error.details.action!.url)}
        >
          {error.details.action.label}
        </Button>
      )}
      <Button color="secondary" onClick={() => navigate("/")}>
        Home
      </Button>
    </div>
  );
}
