import * as z from "zod";

export const usernameSchema = z
  .string()
  .min(3, { message: "Username must be at least 3 characters long." })
  .regex(/^[A-Za-z0-9_]+$/, {
    message:
      "Username must only include uppercase, lowercase, digit, and underscore characters.",
  })
  .optional();
export const emailSchema = z.email("Invalid email address").optional();
export const passwordSchema = z
  .string()
  .regex(/^(?=.*\d)(?=.*[a-z])(?=.*[A-Z])(?=.*[a-zA-Z]).{8,}$/, {
    message:
      "Password must be at least 8 characters long and include uppercase, lowercase, and a digit character.",
  });

export const loginRequestSchema = z.object({
  username: usernameSchema,
  email: emailSchema,
  password: passwordSchema,
});
