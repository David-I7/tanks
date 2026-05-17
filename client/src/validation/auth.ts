import * as z from "zod";

export const usernameSchema = z
  .string()
  .min(3, { message: "Username must be at least 3 characters long." })
  .regex(/^[A-Za-z0-9_]+$/, {
    message:
      "Username must only include uppercase, lowercase, digit, and underscore characters.",
  });

export const emailSchema = z.email("Invalid email address");

export const passwordSchema = z.string().min(8, {
  message: "Password must be at least 8 characters long.",
});

export const loginRequestSchema = z.object({
  username: usernameSchema.optional(),
  email: emailSchema.optional(),
  password: passwordSchema,
});

export const registerRequestSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});
