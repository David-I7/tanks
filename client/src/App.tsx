import { useAuth } from "./context/AuthContext";

export default function App() {
  const auth = useAuth();

  return <div>Hello world</div>;
}
