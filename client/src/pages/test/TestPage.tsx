import { useLocation } from "react-router-dom";

export default function TestPage() {
  const location = useLocation();

  console.log(location);
  return null;
}
