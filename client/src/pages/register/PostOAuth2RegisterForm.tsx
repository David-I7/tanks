import { useState, type ChangeEvent, type SubmitEvent } from "react";
import { ValidationError } from "../../errors/ValidationError";
import { usernameSchema } from "../../validation/auth";
import Form from "../../components/form/Form";
import Label from "../../components/form/Label";
import TextInput from "../../components/form/input/TextInput";
import Button from "../../components/buttons/Button";
import H1 from "../../components/headings/H1";
import { ApiError } from "../../errors/ApiError";
import type ContraintValidationDto from "../../api/http/dto/ConstraintValidationDto";
import UnexpectedError from "../../errors/UnexpectedError";
import NetworkError from "../../errors/NetworkError";
import { useAuthStore } from "../../store/useAuthStore";

type PostOAuth2RegisterFormProps = { token: string };

export default function PostOAuth2RegisterForm({
  token,
}: PostOAuth2RegisterFormProps) {
  const handlePostOAuth2Register = useAuthStore(state => state.handlePostOAuth2Register);
  const [username, setUsername] = useState<string | undefined>(undefined);
  const [errors, setErrors] = useState<
    Record<"username" | "form", ValidationError | null>
  >({ username: null, form: null });

  const handleApiError = (err: ApiError, newErrors: typeof errors) => {
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
      return;
    } else if (err.status >= 400 && err.status < 500) {
      newErrors["form"] = err;
      return;
    }

    newErrors["form"] = new UnexpectedError();
  };

  const handleSubmit = async (e: SubmitEvent) => {
    e.preventDefault();
    if (!isValidForm()) return;

    const usernameValidationResult = usernameSchema.safeParse(username);

    const newErrors: typeof errors = {
      username: null,
      form: null,
    };

    if (usernameValidationResult.success) {
      try {
        await handlePostOAuth2Register({
          token,
          username: usernameValidationResult.data,
        });
      } catch (err) {
        if (err instanceof ApiError) {
          handleApiError(err, newErrors);
        } else if (err instanceof NetworkError) {
          newErrors["form"] = err;
        }
      }
    } else {
      newErrors["username"] = new ValidationError(
        usernameValidationResult.error.issues[0].message,
      );
    }

    setErrors(newErrors);
  };

  const handleUsernameChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newUsername = e.target.value || undefined;
    setUsername(newUsername);
    setErrors({ ...errors, username: null, form: null });
  };

  const isValidForm = () => {
    return username !== undefined && errors.username === null;
  };

  return (
    <Form className="max-h-80" onSubmit={handleSubmit}>
      <div className="flex flex-col flex-1">
        <H1 className="text-center py-4">Enter Username</H1>
        {errors.form !== null && (
          <div className="text-error text-xs font-bold bg-error/10 border border-error/30 p-2.5 rounded-lg mb-4 tracking-wide font-body">
            {errors.form.message}
          </div>
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
            Sign Up
          </Button>
        </div>
      </div>
    </Form>
  );
}
