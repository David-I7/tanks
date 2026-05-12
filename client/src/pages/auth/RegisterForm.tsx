import React, {
  useEffect,
  useState,
  type ChangeEvent,
  type SubmitEvent,
} from "react";
import { useAuth } from "../../context/AuthContext";
import { ValidationError } from "../../errors/ValidationError";
import {
  emailSchema,
  passwordSchema,
  registerRequestSchema,
  usernameSchema,
} from "../../validation/auth";
import { debounce } from "../../utils/performance";
import Form from "../../components/form/Form";
import Label from "../../components/form/Label";
import TextInput from "../../components/form/input/TextInput";
import Password from "../../components/form/input/Password";
import Button from "../../components/buttons/Button";
import LinkButton from "../../components/buttons/LinkButton";
import Or from "../../components/separators/Or";
import GoogleLogin from "./GoogleLogin";
import type { ActiveForm } from "./AuthenticationPage";

type RegisterFormProps = {
  setActiveForm: (activeForm: ActiveForm) => void;
};

export default function RegisterForm({ setActiveForm }: RegisterFormProps) {
  const { handleRegister } = useAuth();
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState<string | undefined>(undefined);
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [errors, setErros] = useState<
    Record<"username" | "password" | "email", ValidationError | null>
  >({ username: null, password: null, email: null });

  const handleSubmit = (e: SubmitEvent) => {
    e.preventDefault();

    if (!username || !password || !email) return;

    const result = registerRequestSchema.safeParse({
      username,
      email,
      password,
    });

    if (result.success) {
      handleRegister(result.data);
    } else {
      const newErrors: typeof errors = {
        password: null,
        username: null,
        email: null,
      };
      result.error.issues.forEach((issue) => {
        if (issue.path[0] === "username") {
          newErrors["username"] = new ValidationError(issue.message);
        } else if (issue.path[0] === "password") {
          newErrors["password"] = new ValidationError(issue.message);
        } else if (issue.path[0] === "email") {
          newErrors["email"] = new ValidationError(issue.message);
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

    const usernameValidationResult = usernameSchema.safeParse(newUsername);

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
  }, 500);

  const handleEmailChange = debounce((e: ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value || undefined;
    setUsername(newEmail);

    function resetError() {
      setErros({ ...errors, email: null });
    }

    if (newEmail === undefined) {
      if (errors.email !== null) resetError();
      return;
    }

    const emailValidationResult = emailSchema.safeParse(newEmail);

    if (emailValidationResult.success) {
      resetError();
      return;
    }

    setErros({
      ...errors,
      email: new ValidationError(emailValidationResult.error.issues[0].message),
    });
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
    return () => handleUsernameChange.cancel();
  }, [errors.username]);

  useEffect(() => {
    return () => handlePasswordChange.cancel();
  }, [errors.password]);

  useEffect(() => {
    return () => handleEmailChange.cancel();
  }, [errors.email]);

  return (
    <Form onSubmit={handleSubmit}>
      <div className="flex flex-col flex-1">
        <h1 className="text-text-headings font-bold text-4xl text-center py-4 font-headings">
          Sign Up
        </h1>
        <div className="flex flex-col flex-1 justify-between pt-4">
          <div className="flex flex-col">
            <div className="h-25">
              <Label htmlFor="username">Username:</Label>
              <TextInput
                id={"username"}
                onChange={handleUsernameChange.fn}
                name="username"
                placeholder="Username..."
                error={errors.username !== null}
                errorMessage={errors.username?.message}
              />
            </div>
            <div className="h-25">
              <Label htmlFor="email">Email:</Label>
              <TextInput
                id={"email"}
                onChange={handleEmailChange.fn}
                name="email"
                placeholder="Email..."
                error={errors.email !== null}
                errorMessage={errors.email?.message}
              />
            </div>
            <div className="h-25 mb-4">
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
            Sign Up
          </Button>
          <div className="text-xs text-text-disabled mt-4">
            Already have an account?{" "}
            <LinkButton
              onClick={() => setActiveForm("LOGIN")}
              className="text-xs"
            >
              Log In
            </LinkButton>
          </div>
        </div>
        <Or className="min-h-20" />
        <GoogleLogin onSuccess={() => {}} onFailure={() => {}} />
      </div>
    </Form>
  );
}
