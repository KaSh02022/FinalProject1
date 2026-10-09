// Central backend configuration (no hard-coded hosts in components).
// Backend base URL: set VITE_API_URL in .env.local (see .env.example). The fallback is the backend's default port.
export const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000/api').replace(/\/+$/, '');
// Backend origin (e.g. for /uploads/... files and Socket.IO)
export const API_ORIGIN = new URL(API_BASE_URL).origin;

// A few backend endpoints answer in Vietnamese. The UI is English-only, so known messages are shown in English;
// the backend contract (field names, status codes, the messages themselves) is unchanged.
const BACKEND_MESSAGES_EN = {
    "Lỗi server": "Server error. Please try again.",
    "Lỗi Server": "Server error. Please try again.",
    "Đã xảy ra lỗi hệ thống khi lấy danh sách công việc!": "A server error occurred while loading the tasks.",
    "Đã xóa ghi chú thành công": "Note deleted.",
    "Đã là thành viên dự án!": "This user is already a member of the project.",
    "Vui lòng chọn ít nhất một file để tải lên": "Please choose at least one file to upload.",
    "User chưa đăng ký!": "No account is registered with this email.",
    "Tải các tài liệu lên thành công": "Documents uploaded.",
    "Thiếu thông tin bắt buộc": "Some required information is missing.",
    "Thiếu projectId": "The project ID is missing.",
    "Lỗi server khi xóa ghi chú": "Server error while deleting the note.",
    "Lỗi server khi tạo ghi chú": "Server error while creating the note.",
    "Lỗi server khi lấy ghi chú": "Server error while loading the notes.",
    "Lỗi server khi lấy danh sách cột": "Server error while loading the columns.",
    "Lỗi máy chủ khi tải file lên": "Server error while uploading the files.",
    "Lỗi hệ thống tính toán dữ liệu Portfolio": "Server error while calculating the portfolio.",
    "Lỗi hệ thống tính toán Portfolio": "Server error while calculating the portfolio.",
};

export const translateBackendMessage = (message) => {
    if (typeof message !== "string") return message;
    return BACKEND_MESSAGES_EN[message.trim()] || message;
};

// Backend errors come as {message}, {error} or both — never surface a raw object
export const getApiErrorMessage = (data, status) =>
    translateBackendMessage(data && (data.message || data.error)) || `Error ${status}: the request could not be completed.`;
