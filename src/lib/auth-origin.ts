import { AppError } from "./domain";

// Google must return to the origin that owns the browser's OAuth state cookie.
export function authOrigin() {
  const value = process.env.BETTER_AUTH_URL;
  if (value) {
    try {
      const url = new URL(value);
      if (["http:", "https:"].includes(url.protocol)) return url.origin;
    } catch {
      // The configuration error below does not expose the URL.
    }
  }
  throw new AppError(
    503,
    "Google sign-in is waiting for a valid application URL.",
  );
}
