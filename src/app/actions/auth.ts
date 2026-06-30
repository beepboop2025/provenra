"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { verifyCredentials } from "@/lib/auth/users";
import { createSession, deleteSession } from "@/lib/auth/session";

/**
 * Server Actions for authentication.
 *
 * Login validates credentials with bcrypt and creates a stateless JWT session.
 * Logout deletes the session cookie and the server-side session record.
 */

const LoginSchema = z.object({
  email: z.string().email({ message: "Please enter a valid email." }).trim(),
  password: z.string().min(1, { message: "Password is required." }).trim(),
});

export type LoginFormState =
  | {
      errors?: {
        email?: string[];
        password?: string[];
        _form?: string[];
      };
      message?: string;
    }
  | undefined;

export async function login(prevState: LoginFormState, formData: FormData): Promise<LoginFormState> {
  const validated = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!validated.success) {
    return { errors: validated.error.flatten().fieldErrors };
  }

  const { email, password } = validated.data;

  const user = await verifyCredentials(email, password);
  if (!user) {
    return {
      errors: { _form: ["Invalid email or password."] },
    };
  }

  await createSession({
    userId: user.id,
    email: user.email,
    role: user.role,
  });

  redirect("/");
}

export async function logout() {
  await deleteSession();
  redirect("/login");
}
