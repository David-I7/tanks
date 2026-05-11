import Button from "../../components/buttons/Button";
import Google from "../../components/icons/Google";
import { useAuth } from "../../context/AuthContext";

type GoogleLoginProps = {
  onSuccess: () => void;
  onFailure: () => void;
};

export default function GoogleLogin({}: GoogleLoginProps) {
  const {} = useAuth();

  return (
    <Button color="secondary" variant="outline" leftIcon={<Google />}>
      Continue with Google
    </Button>
  );
}
