import { io } from "socket.io-client";
import { API_ORIGIN } from "../config/apiConfig.js";

// Socket.IO runs on the backend origin. VITE_SOCKET_URL overrides; otherwise it is the origin of VITE_API_URL.
const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || API_ORIGIN;

export const socket = io(SOCKET_URL, {
    autoConnect: true, // đổi thành true để socket tự kết nối khi app khởi chạy
    transports: ["websocket", "polling"],
    withCredentials: true,
});