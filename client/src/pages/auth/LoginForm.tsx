import { useEffect, useState, type ChangeEvent, type SubmitEvent } from "react";
import { useAuth } from "../../context/AuthContext";
import Password from "../../components/form/input/Password";
import { debounce } from "../../utils/performance";
import {
  emailSchema,
  loginRequestSchema,
  passwordSchema,
  usernameSchema,
} from "../../validation/login";
import { ValidationError } from "../../errors/ValidationError";
import TextInput from "../../components/form/input/TextInput";
import Form from "../../components/form/Form";
import Button from "../../components/buttons/Button";
import Label from "../../components/form/Label";
import Or from "../../components/separators/Or";
import GoogleLogin from "./GoogleLogin";

export default function LoginForm() {
  const { handleLogin } = useAuth();
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState<string | undefined>(undefined);
  const [errors, setErros] = useState<
    Record<"username" | "password", ValidationError | null>
  >({ username: null, password: null });

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();

    if (!username || !password) return;

    const isEmail = username.includes("@");

    const result = loginRequestSchema.safeParse({
      username: isEmail ? undefined : username,
      email: isEmail ? username : undefined,
      password,
    });

    if (result.success) {
      handleLogin(result.data);
    } else {
      const newErrors: typeof errors = { password: null, username: null };
      result.error.issues.forEach((issue) => {
        if (issue.path[0] === "email" || issue.path[0] === "username") {
          newErrors["username"] = new ValidationError(issue.message);
        } else if (issue.path[0] === "password") {
          newErrors["password"] = new ValidationError(issue.message);
        }
      });
    }
  };

  const handlePasswordChange = debounce((e: ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value || undefined;
    setPassword(newPassword);

    function resetError() {
      setErros({ ...errors, password: null });
    }

    if (newPassword === undefined) {
      if (errors.password !== null) resetError();
      return;
    }

    const validationResult = passwordSchema.safeParse(newPassword);

    if (!validationResult.success) {
      setErros({
        ...errors,
        password: new ValidationError(validationResult.error.issues[0].message),
      });
    } else {
      resetError();
    }
  }, 500);

  const handleUsernameChange = debounce((e: ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value || undefined;
    setUsername(newUsername);

    function resetError() {
      setErros({ ...errors, username: null });
    }

    if (newUsername === undefined) {
      if (errors.username !== null) resetError();
      return;
    }

    const isEmail = newUsername.includes("@");

    if (isEmail) {
      const emailValidationResult = emailSchema.safeParse(e.target.value);

      if (emailValidationResult.success) {
        resetError();
        return;
      }

      setErros({
        ...errors,
        username: new ValidationError(
          emailValidationResult.error.issues[0].message,
        ),
      });
    } else {
      const usernameValidationResult = usernameSchema.safeParse(e.target.value);
      if (usernameValidationResult.success) {
        resetError();
        return;
      }

      setErros({
        ...errors,
        username: new ValidationError(
          usernameValidationResult.error.issues[0].message,
        ),
      });
    }
  }, 500);

  const isValidForm = () => {
    return (
      password !== undefined &&
      username !== undefined &&
      errors.password === null &&
      errors.username === null
    );
  };

  useEffect(() => {
    return () => {
      handlePasswordChange.cancel();
      handleUsernameChange.cancel();
    };
  }, [errors]);

  return (
    <Form onSubmit={handleSubmit}>
      <div className="flex flex-col h-full">
        <h1 className="text-text-headings font-bold text-4xl text-center py-4">
          Login
        </h1>
        <div className="flex flex-col flex-1 justify-between">
          <div className="flex flex-col  ">
            <div>
              <Label htmlFor="username">Username:</Label>
              <TextInput
                id={"username"}
                onChange={handleUsernameChange.fn}
                name="username"
                placeholder="Email or username..."
                error={errors.username !== null}
                errorMessage={errors.username?.message}
              />
            </div>
            <div>
              <Label htmlFor="password">Password:</Label>
              <Password
                id={"password"}
                error={errors.password !== null}
                errorMessage={errors.password?.message}
                onChange={handlePasswordChange.fn}
              />
            </div>
          </div>
          <Button
            color="primary"
            variant="filled"
            disabled={isValidForm() ? false : true}
          >
            Login
          </Button>
        </div>
        <Or className="min-h-20" />
        <GoogleLogin onSuccess={() => {}} onFailure={() => {}} />
      </div>
    </Form>
  );
}
