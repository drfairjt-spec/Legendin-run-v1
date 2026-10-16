import 'dotenv/config';
import { User } from "../types";

const TOKEN_KEY = "legendin_jwt_token";
const USER_ID_KEY = "legendin_logged_in_user_id";

// Get saved JWT token
export function getAuthToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

// Store JWT token
export function setAuthToken(token: string): void {
  try {
    localStorage.setItem(TOKEN_KEY, token);
  } catch (err) {
    console.error("Failed to save auth token to localStorage:", err);
  }
}

// Remove JWT token and user session
export function clearAuthToken(): void {
  try {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_ID_KEY);
  } catch (err) {
    console.error("Failed to clear auth token:", err);
  }
}

// Authenticated fetch wrapper
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = getAuthToken();
  const headers = new Headers(options.headers || {});

  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  const response = await fetch(url, {
    ...options,
    headers
  });

  return response;
}

// Login API call
export async function loginApi(phone: string, password: string): Promise<{ token: string; user: User }> {
  const response = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ phone, password })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "خطا در ورود به حساب کاربری.");
  }

  setAuthToken(data.token);
  localStorage.setItem(USER_ID_KEY, data.user.id);
  return data;
}

// Register API call
export async function registerApi(userData: any): Promise<{ token: string; user: User }> {
  const response = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(userData)
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "خطا در ثبت نام.");
  }

  setAuthToken(data.token);
  localStorage.setItem(USER_ID_KEY, data.user.id);
  return data;
}

// Fetch current user from server using token
export async function getCurrentUserApi(): Promise<User | null> {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const response = await authFetch("/api/auth/me");
    if (!response.ok) {
      if (response.status === 401 || response.status === 403) {
        clearAuthToken();
      }
      return null;
    }
    const data = await response.json();
    return data.user || null;
  } catch (err) {
    console.warn("Failed to verify user session with server:", err);
    return null;
  }
}
