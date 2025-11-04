// src/lib/auth.ts
import { cookies, headers } from "next/headers";
import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET;

export interface UserSession {
  userId: string;
  username: string;
  email: string;
  name: string;
  role: string;
}

/**
 * Get current user session from middleware headers (Server Components)
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  const headersList = await headers();
  
  const userId = headersList.get("x-user-id");
  const username = headersList.get("x-user-username");
  const email = headersList.get("x-user-email");
  const name = headersList.get("x-user-name");
  const role = headersList.get("x-user-role");

  if (!userId || !email) {
    return null;
  }

  return {
    userId,
    username: username || "",
    email,
    name: name || "",
    role: role || "",
  };
}

/**
 * Get user session from cookie directly (alternative method)
 */
export async function getUserFromCookie(): Promise<UserSession | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get("auth-token")?.value;

  if (!token) {
    return null;
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as UserSession;
    return decoded;
  } catch (error) {
    return null;
  }
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const user = await getCurrentUser();
  return user !== null;
}

/**
 * Require authentication (throw error if not authenticated)
 */
export async function requireAuth(): Promise<UserSession> {
  const user = await getCurrentUser();
  
  if (!user) {
    throw new Error("Unauthorized");
  }
  
  return user;
}