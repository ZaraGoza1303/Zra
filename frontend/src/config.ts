// Base URLs
export const FRONTEND_URL = "https://stylar-nonseverable-denver.ngrok-free.dev";
export const BACKEND_URL = "http://localhost:8000";

// API Endpoints
export const API_BASE_URL = `${BACKEND_URL}/api`;
export const PUBLIC_URL = `${BACKEND_URL}/public`;

// Paths untuk file uploads
export const ROOMS_PATH = "/public/rooms/";
export const USERS_PATH = "/public/users/";

// Full URLs untuk frontend
export const FRONTEND_JOIN_URL = `${FRONTEND_URL}/join`;

// Helper functions untuk mendapatkan full URL gambar
export const getRoomImageUrl = (
  picturePath: string | null | undefined,
): string => {
  if (!picturePath || typeof picturePath !== 'string') return "";

  let path = picturePath.trim().replace(/^["']|["']$/g, "");

  const urlMatch = path.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    return urlMatch[0];
  }

  if (path.startsWith(BACKEND_URL)) {
    return path;
  }

  if (path.startsWith(ROOMS_PATH)) {
    return `${BACKEND_URL}${path}`;
  }

  const filename = path.split("/").pop() || path;
  return `${BACKEND_URL}${ROOMS_PATH}${filename}`;
};

export const getUserImageUrl = (
  picturePath: string | null | undefined,
): string => {
  if (!picturePath || typeof picturePath !== 'string') return "";

  let path = picturePath.trim().replace(/^["']|["']$/g, "");

  const urlMatch = path.match(/https?:\/\/[^\s]+/);
  if (urlMatch) {
    return urlMatch[0];
  }

  if (path.startsWith(BACKEND_URL)) {
    return path;
  }

  if (path.startsWith(USERS_PATH)) {
    return `${BACKEND_URL}${path}`;
  }

  const filename = path.split("/").pop() || path;
  return `${BACKEND_URL}${USERS_PATH}${filename}`;
};
