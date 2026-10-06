import { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";

function Nav() {
    const [currentUserRole, setCurrentUserRole] = useState("");
    const [member, setMembers] = useState("");
    const [expiringCount, setExpiringCount] = useState(0);

    const getNavClass = ({ isActive }) => (isActive ? "nav-item active" : "nav-item");

    // Lắng nghe event custom hoặc lấy từ localStorage/API
    const checkExpiringTasks = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch("http://localhost:3000/api/task/my-task", {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return;

            const data = await res.json();
            const tasks = Array.isArray(data) ? data : (data?.data || []);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            let count = 0;

            for (const task of tasks) {
                // Bỏ qua task ở cột Done/Completed
                const statusName = (typeof task.columnId === 'object'
                    ? (task.columnId?.name || task.columnId?.title || "")
                    : "").toLowerCase();
                const isDone = statusName.includes('done') || statusName.includes('completed');
                if (isDone) continue;

                // Tính dueDate
                let effectiveDueDate = task.dueDate;
                if (!effectiveDueDate && task.projectId) {
                    const projStartDate = typeof task.projectId === 'object' ? task.projectId?.startDate : null;
                    if (projStartDate) {
                        const baseDate = new Date(projStartDate);
                        if (!isNaN(baseDate.getTime())) {
                            const currentWeek = Math.max(1, Number(task.week) || 1);
                            const daysToAdd = (currentWeek * 7) - 1;
                            baseDate.setDate(baseDate.getDate() + daysToAdd);
                            effectiveDueDate = baseDate;
                        }
                    }
                }

                if (effectiveDueDate) {
                    const dueDate = new Date(effectiveDueDate);
                    dueDate.setHours(0, 0, 0, 0);
                    const diffTime = dueDate.getTime() - today.getTime();
                    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                    if (diffDays > 0 && diffDays <= 2) {
                        count++;
                    }
                }
            }

            setExpiringCount(count);
        } catch (err) {
            console.error("Lỗi đếm task expiring:", err);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem("token");
        if (!token) return;

        fetch("http://localhost:3000/api/user/currentUser", {
            headers: { Authorization: `Bearer ${token}` }
        })
            .then((res) => res.json())
            .then((data) => {
                setCurrentUserRole(data.userRole);
                setMembers(data.memberRole);
            })
            .catch((err) => console.error("Fetch error:", err));

        checkExpiringTasks();

        // Đăng ký event listener để update số đếm mỗi khi MyTasks thay đổi
        const handleTasksUpdated = () => checkExpiringTasks();
        window.addEventListener("myTasksUpdated", handleTasksUpdated);

        return () => {
            window.removeEventListener("myTasksUpdated", handleTasksUpdated);
        };
    }, []);

    return (
        <nav className="sidebar-nav">
            {/* Dashboard */}
            <NavLink to="/dashboard" className={getNavClass}>
                <span className="icon" data-icon="layoutDashboard">
                    <svg viewBox="0 0 24 24"><rect width="7" height="9" x="3" y="3" rx="1"></rect><rect width="7" height="5" x="14" y="3" rx="1"></rect><rect width="7" height="9" x="14" y="12" rx="1"></rect><rect width="7" height="5" x="3" y="16" rx="1"></rect></svg>
                </span>
                <span className="nav-label">Dashboard</span>
            </NavLink>

            {/* My Tasks */}
            <NavLink to="/myTasks" className={getNavClass} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <span className="icon" data-icon="listTodo">
                        <svg viewBox="0 0 24 24"><path d="M13 5h8"></path><path d="M13 12h8"></path><path d="M13 19h8"></path><path d="m3 17 2 2 4-4"></path><rect x="3" y="4" width="6" height="6" rx="1"></rect></svg>
                    </span>
                    <span className="nav-label">My Tasks</span>
                </div>

                {/* Badge thông báo màu đỏ */}
                {expiringCount > 0 && (
                    <span style={{
                        backgroundColor: '#ef4444',
                        color: '#ffffff',
                        fontSize: '11px',
                        fontWeight: 'bold',
                        borderRadius: '9999px',
                        padding: '2px 7px',
                        minWidth: '18px',
                        height: '18px',
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        lineHeight: 1,
                        boxShadow: '0 0 0 2px var(--sidebar-bg, #ffffff)'
                    }}>
                        {expiringCount > 99 ? '99+' : expiringCount}
                    </span>
                )}
            </NavLink>

            {/* Projects */}
            <NavLink to="/project" className={getNavClass}>
                <span className="icon" data-icon="folderKanban">
                    <svg viewBox="0 0 24 24"><path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z"></path><path d="M8 10v4"></path><path d="M12 10v2"></path><path d="M16 10v6"></path></svg>
                </span>
                <span className="nav-label">Projects</span>
            </NavLink>

            {currentUserRole === "Admin" && (
                <>
                    <p className="sidebar-section-label">Admin</p>
                    <NavLink to="/adminuser" className={getNavClass}>
                        <span className="icon" data-icon="shieldCheck">
                            <svg viewBox="0 0 24 24"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"></path><path d="m9 12 2 2 4-4"></path></svg>
                        </span>
                        <span className="nav-label">Users</span>
                    </NavLink>
                </>
            )}
        </nav>
    );
}

export default Nav;