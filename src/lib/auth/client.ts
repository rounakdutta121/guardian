import { createAuthClient } from "better-auth/react";
import { clearUserClientState } from "@/lib/client/user-session";

export const authClient = createAuthClient({
  baseURL: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
});

export const { signIn, signUp, useSession, resetPassword } = authClient;

export const requestPasswordReset = authClient.requestPasswordReset;

export async function signOut(
  ...args: Parameters<typeof authClient.signOut>
) {
  clearUserClientState();
  return authClient.signOut(...args);
}
