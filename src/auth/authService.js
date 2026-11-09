// Simple username/password authentication service
// Replaces ArcGIS OAuth & UMBC-specific authentication

const AUTH_STORAGE_KEY = "cmsc447_user";

/**
 * Retrieve the currently logged-in user from storage, if any.
 */
export function getStoredUser() {
  try {
    const raw = localStorage.getItem(AUTH_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error("Failed to read user from storage", err);
    return null;
  }
}

/**
 * Log in with a simple username and password.
 * Accepts any non-empty credentials for the simplified login flow.
 */
export function login(username, password) {
  const trimmedUser = (username || "").trim();
  const trimmedPass = (password || "").trim();

  if (!trimmedUser || !trimmedPass) {
    return {
      success: false,
      error: "Please enter both a username and password.",
    };
  }

  const user = {
    username: trimmedUser,
    loggedInAt: new Date().toISOString(),
  };

  try {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
  } catch (err) {
    console.error("Failed to persist user in storage", err);
  }

  return { success: true, user };
}

/**
 * Log out the current user and clear local storage.
 */
export function logout() {
  try {
    localStorage.removeItem(AUTH_STORAGE_KEY);
  } catch (err) {
    console.error("Failed to clear user from storage", err);
  }
}

/**
 * Check if a user is currently authenticated.
 */
export function isAuthenticated() {
  return !!getStoredUser();
}
