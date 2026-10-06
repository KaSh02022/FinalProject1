import { io } from "socket.io-client";

const SOCKET_URL = "http://localhost:3000";

export const socket = io(SOCKET_URL, {
    autoConnect: true, // đổi thành true để socket tự kết nối khi app khởi chạy
    transports: ["websocket", "polling"],
    withCredentials: true,
});