// Central backend configuration (no hard-coded hosts in components).
// Backend base URL: set VITE_API_URL in .env.local (see .env.example). The fallback is the backend's default port.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');
// Backend origin (e.g. for /uploads/... files and Socket.IO)
export const API_ORIGIN = new URL(API_BASE_URL).origin;

// Backend errors come as {message}, {error} or both — never surface a raw object
export const getApiErrorMessage = (data, status) =>
    (data && (data.message || data.error)) || `Lỗi ${status}: Không thể thực hiện yêu cầu`;
