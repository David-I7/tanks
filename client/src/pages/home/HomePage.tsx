import { Link } from "react-router-dom";
import Button from "../../components/buttons/Button";
import H1 from "../../components/headings/H1";

export default function HomePage() {
  return (
    <div className="p-4 md:p-6 lg:p-8 h-screen min-h-screen grid place-items-center">
      <div className="bg-surface-high">
        <H1 className="text-center py-4">Welcome to Tanks!</H1>
        <Link to={"/lobby/10"}>
          <Button color="primary">Online</Button>
        </Link>
        <Button color="secondary">Offline</Button>
      </div>
    </div>
  );
}
