import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, ListPlus, FolderPlus, LogOut } from "lucide-react";

function DropdownHeader({ onOpenModal }) {
    const [activeDropdown, setActiveDropdown] = useState(null);
    const navigate = useNavigate();

    // Lấy dữ liệu user thực tế từ localStorage sau khi đăng nhập thành công
    const storedUser = localStorage.getItem("user");
    const user = storedUser ? JSON.parse(storedUser) : null;

    // Tự động tạo chữ Avatar (Ví dụ: "Ngô Lâm" -> "NL")
    const getInitials = (name, email) => {
        if (name) {
            const parts = name.trim().split(" ");
            if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            return name.substring(0, 2).toUpperCase();
        }
        return email ? email.substring(0, 2).toUpperCase() : "U";
    };

    const toggleDropdown = (name) => {
        setActiveDropdown((prev) => (prev === name ? null : name));
    };

    const handleLogout = () => {
        localStorage.clear(); // Xóa sạch dữ liệu đăng nhập cũ
        navigate("/login");
    };

    return (
        <div className="header-actions">

            {/* Nút User Avatar */}
            <div className="dropdown">
                <button
                    data-dropdown-trigger
                    aria-label="Open user menu"
                    onClick={() => toggleDropdown("user")}
                >
          <span className="avatar avatar-sm" style={{ background: "#4f46e5" }}>
            {getInitials(user?.username || user?.name, user?.email)}
          </span>
                </button>

                {activeDropdown === "user" && (
                    <div className="dropdown-menu" data-dropdown-menu>
                        <div className="dropdown-user-info">
                            <p className="dropdown-user-name">{user?.username || user?.name || "User"}</p>
                            <p className="dropdown-user-email">{user?.email || "no-email@domain.com"}</p>
                            <p className="dropdown-user-role">{user?.role || "member"}</p>
                        </div>
                        <div className="dropdown-separator"></div>
                        <button
                            className="dropdown-item destructive"
                            onClick={handleLogout}
                            style={{ width: "100%", border: "none", background: "transparent", cursor: "pointer", textAlign: "left" }}
                        >
                            <LogOut className="icon icon-sm" />
                            Log out
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

export default DropdownHeader;