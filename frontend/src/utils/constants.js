/**
 * Shared constants and helpers for ExtensionShield frontend
 */

// Base64 encoded SVG placeholder for extension icons (puzzle piece icon)
export const EXTENSION_ICON_PLACEHOLDER = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHZpZXdCb3g9IjAgMCA2NCA2NCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KICA8cmVjdCB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHJ4PSIxMiIgZmlsbD0iIzJBMkEzNSIvPgogIDxwYXRoIGQ9Ik0zMiAxNkMyNC4yNjggMTYgMTggMjIuMjY4IDE4IDMwQzE4IDMxLjY1NyAxOC4zMjEgMzMuMjI5IDE4LjkwOSAzNC42NjdMMjIuOTg0IDM0LjY2N0MyMy43MyAzNC42NjcgMjQuMzMzIDM1LjI3IDI0LjMzMyAzNi4wMTZWNDAuMDkxQzI0LjMzMyA0MC44MzggMjMuNzMgNDEuNDQxIDIyLjk4NCA0MS40NDFIMTguOTA5QzIwLjU3MSA0NS42ODcgMjQuMzMzIDQ5LjIyNCAyOC45NTkgNTAuNDg2VjQ2LjQxMUMyOC45NTkgNDUuNjY1IDI5LjU2MiA0NS4wNjIgMzAuMzA4IDQ1LjA2MkgzNC4zODNDMzUuMTMgNDUuMDYyIDM1LjczMyA0NC40NTkgMzUuNzMzIDQzLjcxM1YzOS42MzhDMzUuNzMzIDM4Ljg5MSAzNi4zMzYgMzguMjg4IDM3LjA4MyAzOC4yODhINDEuMTU3QzQxLjkwNCAzOC4yODggNDIuNTA3IDM3LjY4NSA0Mi41MDcgMzYuOTM4VjMyLjg2NEM0Mi41MDcgMzIuMTE3IDQzLjExIDMxLjUxNCA0My44NTcgMzEuNTE0SDQ3LjkzMkM0Ny45NzggMzEuMDE1IDQ4IDMwLjUxIDQ4IDMwQzQ4IDIyLjI2OCA0MS43MzIgMTYgMzIgMTZaIiBmaWxsPSIjNEE5MEU2Ii8+CiAgPGNpcmNsZSBjeD0iMjYiIGN5PSIyNiIgcj0iMyIgZmlsbD0iI0ZGRkZGRiIvPgo8L3N2Zz4=";

function _isLoopbackHostname(hostname) {
  return (
    hostname === "localhost" ||
    hostname === "127.0.0.1" ||
    hostname === "0.0.0.0" ||
    hostname === "::1" ||
    hostname === "[::1]"
  );
}

function _isLoopbackOrigin(origin) {
  try {
    const u = new URL(origin);
    return _isLoopbackHostname(u.hostname);
  } catch {
    return false;
  }
}

/**
 * Build the API URL for an extension's icon. Works for both local (proxy) and production.
 * In production, never use a base URL that points to localhost (e.g. from a mis-set VITE_API_URL);
 * use a relative path so the browser uses the current origin (same-origin API).
 * @param {string} extensionId - Chrome extension ID
 * @returns {string} Full or relative URL to GET /api/scan/icon/{extensionId}, or placeholder if no id
 */
export function getExtensionIconUrl(extensionId) {
  if (!extensionId) return EXTENSION_ICON_PLACEHOLDER;

  let base = import.meta.env.VITE_API_URL || "";

  // DEV: Prefer same-origin relative URL when using a local backend.
  // This keeps the request on the frontend origin (e.g. :5173) where the Vite proxy can forward it,
  // and avoids CSP blocking when base is an HTTP loopback origin (e.g. http://localhost:8007).
  if (import.meta.env.DEV && (!base || _isLoopbackOrigin(base))) {
    return `/api/scan/icon/${extensionId}`;
  }

  // If base points to a loopback host but the app is NOT running on loopback (e.g. production),
  // ignore the base so the browser uses the current origin.
  if (
    typeof window !== "undefined" &&
    base &&
    _isLoopbackOrigin(base) &&
    !_isLoopbackHostname(window.location.hostname)
  ) {
    base = "";
  }

  return base ? `${base}/api/scan/icon/${extensionId}` : `/api/scan/icon/${extensionId}`;
}

/**
 * Single source of truth for GET /api/scan/results/{extensionId} URL.
 * Use this in services and context to avoid duplicate path strings.
 * @param {string} extensionId - Chrome extension ID
 * @returns {string} Full or relative URL for scan results
 */
export function getScanResultsUrl(extensionId) {
  if (!extensionId) return "";
  let base = import.meta.env.VITE_API_URL || "";
  if (import.meta.env.DEV && (!base || _isLoopbackOrigin(base))) {
    return `/api/scan/results/${extensionId}`;
  }
  if (
    typeof window !== "undefined" &&
    base &&
    _isLoopbackOrigin(base) &&
    !_isLoopbackHostname(window.location.hostname)
  ) {
    base = "";
  }
  return base ? `${base}/api/scan/results/${extensionId}` : `/api/scan/results/${extensionId}`;
}
