import { z } from "zod";

const email = z.email("Enter a valid email address").trim().toLowerCase().max(254);

export const password = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .max(72, "Password must be at most 72 characters")
  .regex(/[A-Za-z]/, "Password must contain a letter")
  .regex(/\d/, "Password must contain a number");

const token = z.string().min(20).max(200);

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, "Username must be at least 3 characters")
    .max(30, "Username must be at most 30 characters")
    .regex(/^[\p{L}\p{N}_. -]+$/u, "Username contains invalid characters"),
  email,
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1, "Password is required").max(200),
});

export const googleSchema = z.object({ credential: z.string().min(20) });

export const changePasswordSchema = z.object({
  currentPassword: z.string().max(200).optional(),
  newPassword: password,
});

export const forgotPasswordSchema = z.object({ email });

export const resetPasswordSchema = z.object({ token, password });

export const verifyEmailSchema = z.object({ token });

export const sessionParams = z.object({ id: z.uuid() });

export const requestEmailChangeSchema = z.object({
  email: z.email("Enter a valid email address").max(200),
  password: z.string().max(200).optional(),
});

export const confirmEmailChangeSchema = z.object({ token: z.string().min(10).max(200) });
