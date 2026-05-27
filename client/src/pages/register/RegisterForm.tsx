import { useState, type ChangeEvent, type SubmitEvent } from "react";
import { useAuth } from "../../context/AuthContext";
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
import UnexpectedError from "../../errors/UnexpectedError";
import NetworkError from "../../errors/NetworkError";

export default function RegisterForm() {
  const { handleRegister } = useAuth();
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [password, setPassword] = useState<string | undefined>(undefined);
  const [email, setEmail] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<
    Record<"username" | "password" | "email" | "form", ValidationError | null>
  >({ username: null, password: null, email: null, form: null });

  const handleApiError = (err: ApiError, newErrors: typeof errors) => {
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
      return;
    } else if (err.status >= 400 && err.status < 500) {
      newErrors["form"] = new ValidationError(err.message);
      return;
    }

    newErrors["form"] = new UnexpectedError();
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!isValidForm()) return;

    const registerValidationResult = registerRequestSchema.safeParse({
      password,
      username,
      email,
    });

    const newErrors: typeof errors = {
      password: null,
      username: null,
      email: null,
      form: null,
    };

    if (registerValidationResult.success) {
      try {
        await handleRegister(registerValidationResult.data);
      } catch (err) {
        if (err instanceof ApiError) {
          handleApiError(err, newErrors);
        } else if (err instanceof NetworkError) {
          newErrors["form"] = err;
        }
      }
    } else {
      registerValidationResult.error.issues.forEach((issue) => {
        newErrors[issue.path[0] as keyof typeof errors] = new ValidationError(
          issue.message,
        );
      });
    }

    setErrors(newErrors);
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

  return (
    <Form onSubmit={handleSubmit}>
      <div className="flex flex-col flex-1">
        <H1 className="text-center py-4">Sign Up</H1>
        {errors.form !== null && (
          <div className="text-error-main text-sm">{errors.form.message}</div>
        )}
        <div className="flex flex-col flex-1 justify-between pt-4">
          <div className="flex flex-col">
            <div className="h-25">
              <Label htmlFor="username">Username:</Label>
              <TextInput
                id={"username"}
                onChange={handleUsernameChange}
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
                onChange={handleEmailChange}
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
                onChange={handlePasswordChange}
              />
            </div>
          </div>
          <Button
            type="submit"
            color="primary"
            variant="filled"
            disabled={!isValidForm()}
          >
            Sign Up
          </Button>
          <div className="text-xs text-text-disabled mt-4">
            Already have an account?{" "}
            <DefaultLink to={"/login"} className="text-xs">
              Log In
            </DefaultLink>
          </div>
        </div>
        <Or className="min-h-20" />
        <GoogleLoginWithRedirect
          onFailure={(e) => {
            setErrors({ ...errors, form: e });
          }}
        />
      </div>
    </Form>
  );
}
