import { useEffect, useState, type ChangeEvent, type SubmitEvent } from "react";
import { ValidationError } from "../../errors/ValidationError";
import { registerRequestSchema } from "../../validation/auth";
import Form from "../../components/form/Form";
import Label from "../../components/form/Label";
import TextInput from "../../components/form/input/TextInput";
import Password from "../../components/form/input/Password";
import Button from "../../components/buttons/Button";
import Or from "../../components/misc/Or";
import { GoogleLoginWithRedirect } from "../../components/auth/GoogleLogin";
import DefaultLink from "../../components/links/DefaultLink";
import H1 from "../../components/headings/H1";
import { ApiError } from "../../errors/ApiError";
import type ContraintValidationDto from "../../api/http/dto/ConstraintValidationDto";
import NetworkError from "../../errors/NetworkError";
import { useAuthStore } from "../../store/useAuthStore";
import Loader from "../../components/misc/Loader";
import InvalidStateError from "../../errors/InvalidStateError";
import FormError from "../../components/form/FormError";

export default function RegisterForm() {
  const handleRegister = useAuthStore(state => state.handleRegister);
  const error = useAuthStore(state => state.error);
  const loading = useAuthStore(state => state.loading);
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState<string | undefined>(undefined);
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<
    Record<"username" | "password" | "email" | "form", ValidationError | null>
  >({ username: null, password: null, email: null, form: null });

  const handleApiError = (err: ApiError) => {

    const newErrors: typeof errors = {
      password: null,
      username: null,
      email: null,
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
          } else if (error.field! === "username") {
            newErrors["username"] = new ValidationError(error.message);
          } else {
            newErrors["email"] = new ValidationError(error.message);
          }
        }
      });
      return newErrors;
    } else if (err.status >= 400 && err.status < 500) {
      newErrors["form"] = new ValidationError(err.message);
      return newErrors;
    }

    newErrors["form"] = new InvalidStateError("An error occured trying to register. Please try again later.");
    return newErrors;
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!isValidForm()) return;

    const registerValidationResult = registerRequestSchema.safeParse({
      password,
      username,
      email,
    });


    if (registerValidationResult.success) {
      handleRegister(registerValidationResult.data);
    } else {
      registerValidationResult.error.issues.forEach((issue) => {
        const newErrors: typeof errors = {
          password: null,
          username: null,
          email: null,
          form: null,
        }
        newErrors[issue.path[0] as keyof typeof errors] = new ValidationError(
          issue.message,
        );
        setErrors(newErrors);
      });
    }
  };

  const handlePasswordChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newPassword = e.target.value || undefined;
    setPassword(newPassword);
    setErrors({ ...errors, password: null, form: null });
  };

  const handleEmailChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newEmail = e.target.value || undefined;
    setEmail(newEmail);
    setErrors({ ...errors, email: null, form: null });
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
      email !== undefined &&
      errors.password === null &&
      errors.username === null &&
      errors.email === null
    );
  };

  useEffect(() => {
    if (error === null) return;

    if (error instanceof ApiError) {
      setErrors(handleApiError(error));
    } else if (error instanceof NetworkError) {
      setErrors({ password: null, username: null, email: null, form: error });
    }
  }, [error])


  return (
    <Form onSubmit={handleSubmit}>
      <div className="flex flex-col flex-1">
        <H1 className="text-center py-4">Sign Up</H1>
        {errors.form !== null && (
          <FormError className="mb-4">{errors.form.message}</FormError>
        )}
        <div className="flex flex-col flex-1 justify-between pt-2">
          <div className="flex flex-col">
            <div className="h-24">
              <Label htmlFor="username">Username:</Label>
              <TextInput
                id={"username"}
                onChange={handleUsernameChange}
                name="username"
                placeholder="Username..."
                autoComplete="username"
                error={errors.username !== null}
                errorMessage={errors.username?.message}
              />
            </div>
            <div className="h-24">
              <Label htmlFor="email">Email:</Label>
              <TextInput
                id={"email"}
                onChange={handleEmailChange}
                name="email"
                placeholder="Email..."
                autoComplete="email"
                error={errors.email !== null}
                errorMessage={errors.email?.message}
              />
            </div>
            <div className="h-24 mb-4">
              <Label htmlFor="password">Password:</Label>
              <Password
                id={"password"}
                autoComplete="new-password"
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
            <span>{loading ? <Loader /> : "Sign Up"}</span>
          </Button>
          <div className="text-xs text-text-body/60 mt-4 text-center">
            Already have an account?{" "}
            <DefaultLink to={"/login"} className="text-xs font-bold">
              Log In
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
