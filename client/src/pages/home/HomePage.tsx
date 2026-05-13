import { Navigate } from "react-router-dom";
import Button from "../../components/buttons/Button";
import Form from "../../components/form/Form";
import H1 from "../../components/headings/H1";
import { useAuth } from "../../context/AuthContext";

export default function HomePage() {
  return (
    <Form onSubmit={() => {}}>
      <H1 className="text-center py-4">Welcome to Tanks!</H1>
      <Button color="primary">Online</Button>
      <Button color="secondary">Two Players</Button>
      <Button color="secondary">Single Player</Button>
    </Form>
  );
}
