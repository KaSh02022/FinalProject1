import React, { useState, useEffect, useRef } from "react";
import DropdownHeader from "./DropdownHeader/DropdownHeader";
import { Menu, Bell } from "lucide-react";
import { Link } from "react-router-dom";

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

function Header({ onOpenSidebar, onOpenModal }) {
    const [expiringTasks, setExpiringTasks] = useState([]);
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef(null);

    // Fetch expiring tasks list from API with Project mapping
    const fetchExpiringTasks = async () => {
        const token = localStorage.getItem("token");
        if (!token) return;

        try {
            const res = await fetch("http://localhost:3000/api/task/my-task", {
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
                    const resProj = await fetch(`http://localhost:3000/api/project/${pId}`, {
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

    const count = expiringTasks.length;

    return (
        <header className="header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <button
                className="icon-btn mobile-menu-btn"
                onClick={onOpenSidebar}
                aria-label="Open menu"
            >
                <Menu className="icon" />
            </button>

            {/* Right actions: Bell + Profile */}
            <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
                <div ref={dropdownRef} style={{ position: 'relative' }}>
                    <button
                        className="icon-btn"
                        onClick={() => setIsOpen(!isOpen)}
                        aria-label="Notifications"
                        style={{
                            position: 'relative',
                            width: '38px',
                            height: '38px',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            border: 'none',
                            background: '#f3f4f6'
                        }}
                    >
                        <Bell className="icon" size={20} color="#374151" />

                        {count > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-2px',
                                right: '-2px',
                                backgroundColor: '#ef4444',
                                color: '#ffffff',
                                fontSize: '11px',
                                fontWeight: 'bold',
                                borderRadius: '9999px',
                                minWidth: '18px',
                                height: '18px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                padding: '0 4px',
                                border: '2px solid #ffffff',
                                boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
                            }}>
                                {count > 99 ? '99+' : count}
                            </span>
                        )}
                    </button>

                    {isOpen && (
                        <div style={{
                            position: 'absolute',
                            top: '46px',
                            right: '0',
                            width: '320px',
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
                            border: '1px solid #e5e7eb',
                            zIndex: 1000,
                            overflow: 'hidden'
                        }}>
                            <div style={{ padding: '12px 16px', borderBottom: '1px solid #f3f4f6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <strong style={{ fontSize: '14px', color: '#111827' }}>Notifications</strong>
                                <span style={{ fontSize: '12px', color: '#ef4444', fontWeight: 600 }}>{count} expiring soon</span>
                            </div>

                            <div style={{ maxHeight: '320px', overflowY: 'auto' }}>
                                {expiringTasks.length === 0 ? (
                                    <div style={{ padding: '24px 16px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                                        No expiring tasks
                                    </div>
                                ) : (
                                    expiringTasks.map((task) => (
                                        <Link
                                            key={task._id}
                                            to="/myTasks"
                                            onClick={() => setIsOpen(false)}
                                            style={{
                                                display: 'block',
                                                padding: '10px 16px',
                                                borderBottom: '1px solid #f9fafb',
                                                textDecoration: 'none',
                                                color: 'inherit',
                                                transition: 'background 0.15s'
                                            }}
                                            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f9fafb'}
                                            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                        >
                                            <div style={{ fontSize: '13px', fontWeight: 600, color: '#1f2937', marginBottom: '2px' }}>
                                                {task.title || task.name}
                                            </div>
                                            <div style={{ fontSize: '11px', color: '#d97706', fontWeight: 500 }}>
                                                 Expiring soon
                                            </div>
                                        </Link>
                                    ))
                                )}
                            </div>

                            <Link
                                to="/myTasks"
                                onClick={() => setIsOpen(false)}
                                style={{
                                    display: 'block',
                                    textAlign: 'center',
                                    padding: '10px',
                                    backgroundColor: '#f9fafb',
                                    color: '#2563eb',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    textDecoration: 'none',
                                    borderTop: '1px solid #f3f4f6'
                                }}
                            >
                                View all in My Tasks
                            </Link>
                        </div>
                    )}
                </div>

                <DropdownHeader onOpenModal={onOpenModal} />
            </div>
        </header>
    );
}

export default Header;