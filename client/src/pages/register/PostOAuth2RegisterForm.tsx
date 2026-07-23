import { useEffect, useState, type ChangeEvent, type SubmitEvent } from "react";
import { ValidationError } from "../../errors/ValidationError";
import { usernameSchema } from "../../validation/auth";
import Form from "../../components/form/Form";
import Label from "../../components/form/Label";
import TextInput from "../../components/form/input/TextInput";
import Button from "../../components/buttons/Button";
import H1 from "../../components/headings/H1";
import { ApiError } from "../../errors/ApiError";
import type ContraintValidationDto from "../../api/http/dto/ConstraintValidationDto";
import NetworkError from "../../errors/NetworkError";
import { useAuthStore } from "../../store/useAuthStore";
import Loader from "../../components/misc/Loader";
import InvalidStateError from "../../errors/InvalidStateError";
import FormError from "../../components/form/FormError";
import { useFetch } from "../../hooks/useFetch";
import PostOauth2RegisterRequest from "../../api/http/requests/auth/PostOauth2RegisterRequest";

type PostOAuth2RegisterFormProps = { token: string };

export default function PostOAuth2RegisterForm({
  token,
}: PostOAuth2RegisterFormProps) {
  const register = useAuthStore((state) => state.postOAuth2Register);
  const { trigger, error, isLoading } = useFetch(register);
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<
    Record<"username" | "form", ValidationError | null>
  >({ username: null, form: null });

  const handleApiError = (err: ApiError) => {
    const newErrors: typeof errors = {
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
          if (error.field! === "username") {
            newErrors["username"] = new ValidationError(error.message);
          }
        }
      });
      return newErrors;
    } else if (err.status >= 400 && err.status < 500) {
      newErrors["form"] = err;
      return newErrors;
    }

    newErrors["form"] = new InvalidStateError(
      "An error occured trying to register. Please try again later.",
    );
    return newErrors;
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!isValidForm()) return;

    const usernameValidationResult = usernameSchema.safeParse(username);

    if (usernameValidationResult.success) {
      await trigger(
        new PostOauth2RegisterRequest({
          token,
          username: usernameValidationResult.data,
        }),
      );
    } else {
      setErrors({
        username: new ValidationError(
          usernameValidationResult.error.issues[0].message,
        ),
        form: null,
      });
    }
  };

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value || undefined;
    setUsername(newUsername);
    setErrors({ ...errors, username: null, form: null });
  };

  const isValidForm = () => {
    return username !== undefined && errors.username === null;
  };

  useEffect(() => {
    if (error === null) return;

    if (error instanceof ApiError) {
      setErrors(handleApiError(error));
    } else if (error instanceof NetworkError) {
      setErrors({ username: null, form: error });
    }
  }, [error]);

  return (
    <Form className="max-h-80" onSubmit={handleSubmit}>
      <div className="flex flex-col flex-1">
        <H1 className="text-center py-4">Enter Username</H1>
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
          </div>
          <Button
            type="submit"
            color="primary"
            variant="filled"
            disabled={!isValidForm()}
          >
            {isLoading ? <Loader /> : "Continue"}
          </Button>
        </div>
      </div>
    </Form>
  );
}
