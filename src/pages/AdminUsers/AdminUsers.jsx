import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { updateUserStatus } from "../../../api";
import { API_BASE_URL } from "../../config/apiConfig.js";
import ErrorState from "../../components/common/ErrorState.jsx";
import { failureMessage } from "../../utils/requestState.js";
import { notify } from "../../utils/notify.js";

function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedRole, setSelectedRole] = useState("All");
    // User list request failed: show the error, not an empty list. Bump reloadKey to retry.
    const [loadError, setLoadError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);
    const navigate = useNavigate();

    // Lấy ID người dùng hiện tại từ localStorage
    const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
    const currentUserId = currentUser._id || currentUser.id;

    const filteredUsers = users.filter((user) => {
        const matchSearch =
            user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
            user.email.toLowerCase().includes(searchTerm.toLowerCase());

        const matchRole = selectedRole === "All" ? true : user.role === selectedRole;

        return matchSearch && matchRole;
    });

    useEffect(() => {
        fetch(`${API_BASE_URL}/user`)
            .then((res) => {
                if (!res.ok) throw new Error(`Error ${res.status}: the user list could not be loaded.`);
                return res.json();
            })
            .then((data) => setUsers(data))
            .catch((err) => {
                console.error(" Fetch error:", err);
                setLoadError(err);
            });
    }, [reloadKey]);

    const retryLoad = () => {
        setLoadError(null);
        setReloadKey((k) => k + 1);
    };

    const handleToggleStatus = async (userId, currentStatus) => {
        const newStatus = currentStatus === "Active" ? "Inactive" : "Active";
        try {
            // Gọi hàm từ api.jsx
            await updateUserStatus(userId, newStatus);

            // Cập nhật state UI
            setUsers((prev) =>
                prev.map((u) => (u._id === userId ? { ...u, status: newStatus } : u))
            );

            notify({ type: "success", title: "Changed successfully" });
        } catch (err) {
            console.error("Lỗi cập nhật trạng thái:", err);
            // was console-only: the switch looked like it worked
            notify({ type: "error", title: "Couldn't change the account status", message: err.message });
        }
    };

    return (
        <>
            <main className="page-content">
                <div className="page-content-inner">
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span className="icon icon-lg" data-icon="shieldCheck" style={{ color: "var(--color-primary-600)" }}>
              <svg viewBox="0 0 24 24">
                <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path>
                <path d="m9 12 2 2 4-4"></path>
              </svg>
            </span>
                        <h1>Admin · Users</h1>
                    </div>
                    <p className="page-subtitle" style={{ marginBottom: "var(--space-6)" }}>
                        Manage accounts across the whole platform.
                    </p>

                    <div className="filter-bar-row" style={{ marginBottom: "var(--space-4)" }}>
                        <div className="input-icon-wrap" style={{ maxWidth: "320px" }}>
              <span className="icon icon-sm" data-icon="search">
                <svg viewBox="0 0 24 24">
                  <path d="m21 21-4.34-4.34"></path>
                  <circle cx="11" cy="11" r="8"></circle>
                </svg>
              </span>
                            <input
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="input"
                                placeholder="Search by name or email…"
                                aria-label="Search users by name or email"
                                data-filter-input="adminUsers"
                            />
                        </div>
                        <select
                            onChange={(e) => setSelectedRole(e.target.value)}
                            aria-label="Filter by role"
                            className="select"
                            style={{ width: "auto", minWidth: "150px" }}
                        >
                            <option value="All">Role: All</option>
                            <option value="User">User</option>
                            <option value="Admin">Admin</option>
                        </select>
                    </div>

                    {loadError && (
                        <ErrorState
                            title="Couldn't load users"
                            message={failureMessage({ error: loadError })}
                            onRetry={retryLoad}
                        />
                    )}
                    <div className={loadError ? "hidden" : "card"}>
                        {filteredUsers.map((user) => (
                            <div key={user._id} className="admin-user-row" data-filter-target="adminUsers">
                                <div className="admin-user-identity">
                  <span className="avatar avatar-sm" style={{ background: "#db2777" }}>
                    {user.username ? user.username.charAt(0).toUpperCase() : "U"}
                  </span>
                                    <div className="member-identity-text">
                                        <p className="member-name">{user.username}</p>
                                        <p className="member-email">{user.email}</p>
                                    </div>
                                </div>
                                <span className="badge badge-primary">{user.role}</span>
                                <span className={user.role === "Admin" ? "hidden" : user.status === "Active" ? "badge badge-success" : "badge badge-danger"}>
                  {user.status}
                </span>
                                <span className={user.role === "Admin" ? "hidden" : "admin-user-joined"}>
                  Joined{" "}
                                    {user.createdAt
                                        ? new Date(user.createdAt).toLocaleDateString("en-GB", {
                                            day: "2-digit",
                                            month: "2-digit",
                                            year: "numeric",
                                        })
                                        : "N/A"}
                </span>
                                {user.role && (
                                    <button
                                        onClick={() => handleToggleStatus(user._id, user.status)}
                                        className={`suspend-btn ${user.role === "Admin" ? "hidden" : ""}`}
                                    >
                    <span className="icon icon-sm" data-icon="userX">
                      {user.status === "Active" ? (
                          <svg viewBox="0 0 24 24">
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                              <line x1="17" x2="22" y1="8" y2="13"></line>
                              <line x1="22" x2="17" y1="8" y2="13"></line>
                          </svg>
                      ) : (
                          <svg viewBox="0 0 24 24">
                              <path d="m16 11 2 2 4-4"></path>
                              <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"></path>
                              <circle cx="9" cy="7" r="4"></circle>
                          </svg>
                      )}
                    </span>
                                        {user.status === "Active" ? "Suspend" : "Reactivate"}
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </main>

        </>
    );
}

export default AdminUsers;