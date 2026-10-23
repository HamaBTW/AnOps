import { auth, signIn } from "@/server/auth";
import { redirect } from "next/navigation";
import { registerUser } from "@/features/auth/actions/register.action";
import { requestPasswordReset } from "@/features/auth/actions/password-reset.action";
import { resetPassword } from "@/features/auth/actions/password-reset.action";

export async function loginAction(formData: FormData) {
  "use server";
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const callbackUrl = (formData.get("callbackUrl") as string) || "/";

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    throw error;
  }
}

export async function registerAction(formData: FormData) {
  "use server";
  const result = await registerUser({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!result.ok) {
    throw new Error(result.message);
  }

  redirect("/unverified");
}

export async function forgotPasswordAction(formData: FormData) {
  "use server";
  const result = await requestPasswordReset({
    email: formData.get("email"),
  });

  if (!result.ok) {
    throw new Error(result.message);
  }

  redirect("/login?reset=sent");
}

export async function resetPasswordAction(formData: FormData) {
  "use server";
  const result = await resetPassword({
    token: formData.get("token"),
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!result.ok) {
    throw new Error(result.message);
  }

  redirect("/login?reset=success");
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireActive() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const client = (await import("@/server/db/client")).default;
  const db = (await client).db();
  const user = await db.collection("users").findOne({ email: session.user.email });

  if (!user) redirect("/login");
  if (user.status === "banned") redirect("/banned");
  if (user.status === "unverified" || !user.emailVerified) redirect("/unverified");

  return session;
}
