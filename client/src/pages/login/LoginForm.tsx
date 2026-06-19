import { useEffect, useState, type ChangeEvent, type SubmitEvent } from "react";
import Password from "../../components/form/input/Password";
import { loginRequestSchema } from "../../validation/auth";
import { ValidationError } from "../../errors/ValidationError";
import TextInput from "../../components/form/input/TextInput";
import Form from "../../components/form/Form";
import Button from "../../components/buttons/Button";
import Label from "../../components/form/Label";
import Or from "../../components/misc/Or";
import { GoogleLoginWithRedirect } from "../../components/auth/GoogleLogin";
import DefaultLink from "../../components/links/DefaultLink";
import H1 from "../../components/headings/H1";
import { ApiError } from "../../errors/ApiError";
import NetworkError from "../../errors/NetworkError";
import UnexpectedError from "../../errors/UnexpectedError";
import type ContraintValidationDto from "../../api/http/dto/ConstraintValidationDto";
import { useAuthStore } from "../../store/useAuthStore";
import Loader from "../../components/misc/Loader";


export default function LoginForm() {
  const handleLogin = useAuthStore(state => state.handleLogin);
  const error = useAuthStore(state => state.error);
  const loading = useAuthStore(state => state.loading);
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<
    Record<"username" | "password" | "form", Error | null>
  >({ username: null, password: null, form: null });

  const handleApiError = (err: ApiError) => {
    const newErrors: typeof errors = {
      password: null,
      username: null,
      form: null,
    };

    if (err.status === 400 && err.data["errors"] !== undefined) {
      const constraintValidtionErrors: ContraintValidationDto[] = err.data[
        "errors"
      ] as ContraintValidationDto[];

      constraintValidtionErrors.forEach((error) => {
        if (error.type === "OBJECT") {
          newErrors["form"] = new ValidationError(error.message);
        } else {
          if (error.field! === "password") {
            newErrors["password"] = new ValidationError(error.message);
          } else {
            newErrors["username"] = new ValidationError(error.message);
          }
        }
      });
      return newErrors;
    } else if (err.status >= 400 && err.status < 500) {
      newErrors["form"] = err;
      return newErrors;
    }

    newErrors["form"] = new UnexpectedError();
    return newErrors;
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!isValidForm()) return;

    const isEmail = username!.includes("@");

    const loginValidationResult = loginRequestSchema.safeParse(
      isEmail ? { password, email: username } : { password, username },
    );

    const newErrors: typeof errors = {
      password: null,
      username: null,
      form: null,
    };

    if (loginValidationResult.success) {
      handleLogin(loginValidationResult.data);
      return;
    } else {
      loginValidationResult.error.issues.forEach((issue) => {
        const key = issue.path[0] as "email" | "password" | "username";
        newErrors[key === "email" ? "username" : key] = new ValidationError(
          issue.message,
        );
      });
      setErrors(newErrors);
    }
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value || undefined;
    setPassword(newPassword);
    setErrors({ ...errors, password: null, form: null });
  };

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value || undefined;
    setUsername(newUsername);
    setErrors({ ...errors, username: null, form: null });
  };

  const isValidForm = () => {
    return (
      password !== undefined &&
      username !== undefined &&
      errors.password === null &&
      errors.username === null
    );
  };

  useEffect(() => {
    if (error === null) return;

    if (error instanceof ApiError) {
      if (error.status === 401) return;
      setErrors(handleApiError(error))
    } else if (error instanceof NetworkError) {
      setErrors({ password: null, username: null, form: error });
    }
  }, [error])

  return (
    <Form onSubmit={handleSubmit}>
      <div className="flex flex-col flex-1">
        <H1 className="text-center py-4">Log In</H1>
        {errors.form !== null && (
          <div className="text-error text-xs font-bold bg-error/10 border border-error/30 p-2.5 rounded-lg mb-4 tracking-wide font-body">
            {errors.form.message}
          </div>
        )}
        <div className="flex flex-col flex-1 justify-between pt-2">
          <div className="flex flex-col">
            <div className="h-24">
              <Label htmlFor="username">Username/Email:</Label>
              <TextInput
                id={"username"}
                onChange={handleUsernameChange}
                name="username"
                placeholder="Email or username..."
                error={errors.username !== null}
                errorMessage={errors.username?.message}
              />
            </div>
            <div className="h-24 mb-4">
              <Label htmlFor="password">Password:</Label>
              <Password
                id={"password"}
                error={errors.password !== null}
                errorMessage={errors.password?.message}
                onChange={handlePasswordChange}
              />
            </div>
          </div>
          <Button
            type="submit"
            color="primary"
            variant="filled"
            disabled={!isValidForm() || loading}
          >
            <span>{loading ? <Loader /> : "Log In"}</span>
          </Button>
          <div className="text-xs text-text-body/60 mt-4 text-center font-body">
            Don't have an account?{" "}
            <DefaultLink to={"/signup"} className="text-xs font-bold">
              Sign Up
            </DefaultLink>
          </div>
        </div>
        <Or className="my-4" />
        <GoogleLoginWithRedirect
          onFailure={(e) => {
            setErrors({ ...errors, form: e });
          }}
        />
      </div>
    </Form>
  );
}
