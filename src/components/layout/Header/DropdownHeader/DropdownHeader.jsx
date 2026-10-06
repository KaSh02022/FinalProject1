import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut } from "lucide-react";

// Signed-in user as stored by the login page; null when missing or unreadable
const readStoredUser = () => {
    try {
        return JSON.parse(localStorage.getItem("user") || "null");
    } catch {
        return null;
    }
};

function DropdownHeader() {
    const [isOpen, setIsOpen] = useState(false);
    const menuRef = useRef(null);
    const navigate = useNavigate();

    // Lấy dữ liệu user thực tế từ localStorage sau khi đăng nhập thành công
    const user = readStoredUser();
    const displayName = user?.username || user?.name || "";

    // Tự động tạo chữ Avatar (Ví dụ: "Ngô Lâm" -> "NL")
    const getInitials = (name, email) => {
        if (name) {
            const parts = name.trim().split(" ");
            if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
            return name.substring(0, 2).toUpperCase();
        }
        return email ? email.substring(0, 2).toUpperCase() : "U";
    };

    // Click outside / Esc closes the menu
    useEffect(() => {
        if (!isOpen) return;
        const onMouseDown = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) setIsOpen(false);
        };
        const onKeyDown = (e) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("mousedown", onMouseDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onMouseDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [isOpen]);

    const handleLogout = () => {
        localStorage.clear(); // Xóa sạch dữ liệu đăng nhập cũ
        navigate("/login");
    };

    return (
        <div className="dropdown" ref={menuRef}>
            <button
                type="button"
                className="avatar-btn"
                aria-label={displayName ? `Account menu for ${displayName}` : "Account menu"}
                aria-haspopup="menu"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((prev) => !prev)}
            >
                <span className="avatar avatar-sm" aria-hidden="true">
                    {getInitials(displayName, user?.email)}
                </span>
            </button>

            {isOpen && (
                <div className="dropdown-menu" role="menu">
                    {/* Only show what the stored user actually has — no placeholder identity */}
                    {(displayName || user?.email || user?.role) && (
                        <>
                            <div className="dropdown-user-info">
                                {displayName && <p className="dropdown-user-name">{displayName}</p>}
                                {user?.email && <p className="dropdown-user-email">{user.email}</p>}
                                {user?.role && <p className="dropdown-user-role">{user.role}</p>}
                            </div>
                            <div className="dropdown-separator"></div>
                        </>
                    )}
                    <button type="button" role="menuitem" className="dropdown-item destructive" onClick={handleLogout}>
                        <LogOut className="icon icon-sm" />
                        Log out
                    </button>
                </div>
            )}
        </div>
    );
}

export default DropdownHeader;
