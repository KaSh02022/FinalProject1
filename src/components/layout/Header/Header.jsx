import { useState, useEffect, useRef } from "react";
import DropdownHeader from "./DropdownHeader/DropdownHeader";
import { Menu, Bell } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { API_BASE_URL } from "../../../config/apiConfig.js";

// Helper calculate due date based on project start date and week
const calculateDueDateByWeek = (startDateStr, weekNum = 1) => {
    if (!startDateStr) return null;
    const baseDate = new Date(startDateStr);
    if (isNaN(baseDate.getTime())) return null;
    const daysToAdd = (Math.max(1, Number(weekNum) || 1) * 7) - 1;
    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + daysToAdd);
    return dueDate;
};

// Page context shown on the left of the header, derived from the route only (no extra API call)
const ROUTE_CONTEXT = [
    { prefix: "/dashboard", title: "Dashboard" },
    { prefix: "/myTasks", title: "My Tasks" },
    { prefix: "/adminuser", title: "Users", parent: "Admin" },
    { prefix: "/projectoverview", title: "Overview", parent: "Projects" },
    { prefix: "/projectchart", title: "Chart", parent: "Projects" },
    { prefix: "/projectboard", title: "Board", parent: "Projects" },
    { prefix: "/projectlist", title: "Backlog", parent: "Projects" },
    { prefix: "/projectcalendar", title: "Calendar", parent: "Projects" },
    { prefix: "/projecttimeline", title: "Timeline", parent: "Projects" },
    { prefix: "/projectsetting", title: "Settings", parent: "Projects" },
    { prefix: "/project", title: "Projects" },
];

function Header({ onOpenSidebar, menuButtonRef, sidebarOpen = false }) {
    const [expiringTasks, setExpiringTasks] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Fetch expiring tasks list from API with Project mapping
    const fetchExpiringTasks = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch(`${API_BASE_URL}/task/my-task`, {
                headers: { Authorization: `Bearer ${token}` }
            });
            if (!res.ok) return;

            const data = await res.json();
            const tasks = Array.isArray(data) ? data : (data?.data || []);

            // 1. Collect unique project IDs that need details
            const uniqueProjIds = Array.from(new Set(
                tasks.map(t => {
                    if (typeof t.projectId === 'object') return t.projectId?._id || t.projectId?.id;
                    return t.projectId;
                }).filter(Boolean)
            ));

            // 2. Fetch project details to get startDate
            const projectMap = {};
            await Promise.all(uniqueProjIds.map(async (pId) => {
                try {
                    const resProj = await fetch(`${API_BASE_URL}/project/${pId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (resProj.ok) {
                        const pData = await resProj.json();
                        projectMap[pId] = pData?.data || pData;
                    }
                } catch {
                    // ignore error
                }
            }));

            // 3. Filter expiring tasks
            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const filtered = tasks.filter((task) => {
                // Check status
                const statusName = (typeof task.columnId === 'object'
                    ? (task.columnId?.name || task.columnId?.title || "")
                    : "").toLowerCase();
                const isDone = statusName.includes('done') || statusName.includes('completed');
                if (isDone) return false;

                // Get startDate from populated object OR projectMap
                const projId = typeof task.projectId === 'object' ? (task.projectId?._id || task.projectId?.id) : task.projectId;
                const projStartDate = (typeof task.projectId === 'object' && task.projectId?.startDate)
                    ? task.projectId?.startDate
                    : projectMap[projId]?.startDate;

                // Calculate effective due date
                const effectiveDueDate = task.dueDate || calculateDueDateByWeek(projStartDate, task.week || 1);
                if (!effectiveDueDate) return false;

                const dueDate = new Date(effectiveDueDate);
                dueDate.setHours(0, 0, 0, 0);

                const diffTime = dueDate.getTime() - today.getTime();
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                // Expiring condition: 0 to 2 days left
                return diffDays >= 0 && diffDays <= 2;
            });

            setExpiringTasks(filtered);
        } catch (err) {
            console.error("Error fetching expiring tasks notifications:", err);
        }
    };

    useEffect(() => {
        fetchExpiringTasks();

        // Listen for updates from other components (like MyTasks)
        const handleUpdate = () => fetchExpiringTasks();
        window.addEventListener("myTasksUpdated", handleUpdate);

        // Click outside to close dropdown
        const handleClickOutside = (e) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);

        return () => {
            window.removeEventListener("myTasksUpdated", handleUpdate);
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, []);

    // Esc closes the notification panel
    useEffect(() => {
        if (!isOpen) return;
        const onKeyDown = (e) => {
            if (e.key === "Escape") setIsOpen(false);
        };
        document.addEventListener("keydown", onKeyDown);
        return () => document.removeEventListener("keydown", onKeyDown);
    }, [isOpen]);

    const { pathname } = useLocation();
    const context = ROUTE_CONTEXT.find((c) => pathname.startsWith(c.prefix));

    const count = expiringTasks.length;

    return (
        <header className="header">
            <button
                ref={menuButtonRef}
                type="button"
                className="icon-btn mobile-menu-btn"
                onClick={onOpenSidebar}
                aria-label="Open menu"
                aria-controls="app-sidebar"
                aria-expanded={sidebarOpen}
            >
                <Menu className="icon" />
            </button>

            {context && (
                <div className="header-context">
                    {context.parent === "Projects" ? (
                        <Link to="/project" className="header-context-link header-context-parent">Projects</Link>
                    ) : context.parent ? (
                        <span className="header-context-parent">{context.parent}</span>
                    ) : null}
                    {context.parent && <span className="header-context-sep" aria-hidden="true">/</span>}
                    <span className="header-context-current" aria-current="page">{context.title}</span>
                </div>
            )}

            {/* Right actions: Bell + Profile */}
            <div className="header-actions">
                <div ref={dropdownRef} className="header-popover-anchor">
                    <button
                        type="button"
                        className="icon-btn notif-btn"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label={count > 0 ? `Notifications, ${count} expiring soon` : "Notifications"}
                        aria-haspopup="true"
                        aria-expanded={isOpen}
                    >
                        <Bell className="icon" />
                        {count > 0 && (
                            <span className="notif-count" aria-hidden="true">{count > 99 ? '99+' : count}</span>
                        )}
                    </button>

                    {isOpen && (
                        <div className="notif-panel" role="region" aria-label="Notifications">
                            <div className="notif-panel-header">
                                <strong className="notif-panel-title">Notifications</strong>
                                <span className="notif-panel-meta">{count} expiring soon</span>
                            </div>

                            <div className="notif-list">
                                {expiringTasks.length === 0 ? (
                                    <div className="notif-empty">No expiring tasks</div>
                                ) : (
                                    expiringTasks.map((task) => (
                                        <Link
                                            key={task._id}
                                            to="/myTasks"
                                            onClick={() => setIsOpen(false)}
                                            className="notif-item"
                                        >
                                            <div className="notif-item-title">{task.title || task.name}</div>
                                            <div className="notif-item-meta">Expiring soon</div>
                                        </Link>
                                    ))
                                )}
                            </div>

                            <Link to="/myTasks" onClick={() => setIsOpen(false)} className="notif-footer">
                                View all in My Tasks
                            </Link>
                        </div>
                    )}
                </div>

                <DropdownHeader />
            </div>
        </header>
    );
}

export default Header;