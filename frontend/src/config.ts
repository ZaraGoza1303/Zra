// Base URLs — pake env variable biar gak hardcode
export const BACKEND_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
export const FRONTEND_URL = import.meta.env.VITE_FRONTEND_URL || BACKEND_URL.replace(":8000", ":5173");

// API Endpoints
export const API_BASE_URL = `${BACKEND_URL}/api`;
export const PUBLIC_URL = `${BACKEND_URL}/public`;

// Paths untuk file uploads
export const ROOMS_PATH = "/public/rooms/";
export const USERS_PATH = "/public/users/";

// Full URLs untuk frontend
export const FRONTEND_JOIN_URL = `${FRONTEND_URL}/join`;
