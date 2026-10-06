import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from './../../components/layout/Header/Header.jsx';
import Sidebar from './../../components/layout/Sidebar/Sidebar.jsx';

import {
    LayoutGrid,
    List,
    Calendar,
    Settings,
    Plus,
    Loader2,
    ArrowRightCircle,
    UsersRound,
    ListChecks,
    CalendarClock,
    Trash2,
    Info, BarChart2,
} from 'lucide-react';

import {
    fetchProjectById,
    fetchTasksByProject,
    fetchColumnsByProject,
    fetchMembersByProject,
    createTask,
    moveTask,
    deleteTask
} from '../../../api.jsx';

// Helper function format ngày dạng DD/MM/YYYY
const formatDate = (dateString, fallback = 'Chưa đặt') => {
    if (!dateString) return fallback;
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return fallback;

    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();

    return `${day}/${month}/${year}`;
};

export default function ProjectList() {
    const { id: projectId } = useParams();

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
    const [activeModal, setActiveModal] = useState(null);

    const [project, setProject] = useState({});
    const [projectMembers, setProjectMembers] = useState([]);
    const [memberCurrentRole, setMemberRole] = useState("");
    const [columns, setColumns] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('Medium');
    const [newTaskPoints, setNewTaskPoints] = useState(0);
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskWeek, setNewTaskWeek] = useState(1);

    const getCurrentUser = () => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    };

    const currentUser = getCurrentUser();
    const currentUserId = currentUser._id || currentUser.id || null;

    const fetchCurrentMemberRole = async () => {
        try {
            const token = localStorage.getItem("token");
            if (!token) return;

            const res = await fetch("http://localhost:3000/api/user/currentUser", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            setMemberRole(data.memberRole || "");
        } catch (err) {
            console.error("Không thể lấy thông tin role hiện tại:", err);
        }
    };

    useEffect(() => {
        fetchCurrentMemberRole();
    }, []);

    const currentProjectMember = useMemo(() => {
        if (!currentUserId || !projectMembers.length) return null;

        return projectMembers.find(m => {
            const uId = m.userId?._id || m.userId?.id || m.userId || m._id || m.id;
            return String(uId) === String(currentUserId);
        }) || null;
    }, [currentUserId, projectMembers]);

    const currentUserRole = currentProjectMember?.role || currentUser?.role || memberCurrentRole;

    const isAdmin = String(currentUser?.role).toLowerCase() === 'admin';
    const isLeader = currentUserRole === 'Leader';
    const isManager = currentUserRole === 'Manager' || isAdmin;

    // Kiểm tra xem week của task đã đến hạn so với startDate dự án hay chưa
    const isTaskDueForBoard = (taskWeek, projectStartDate) => {
        if (!projectStartDate) return false;

        const start = new Date(projectStartDate);
        if (isNaN(start.getTime())) return false;

        // Reset giờ về 00:00:00 để so sánh chính xác theo ngày
        start.setHours(0, 0, 0, 0);

        const weekNum = Number(taskWeek) || 1;
        // Tính ngày bắt đầu của Week N: startDate + (weekNum - 1) * 7 ngày
        const weekStartDate = new Date(start);
        weekStartDate.setDate(start.getDate() + (weekNum - 1) * 7);

        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Trả về true nếu ngày hiện tại >= ngày bắt đầu của Week đó
        return today >= weekStartDate;
    };

    const loadData = async () => {
        if (!projectId) return;

        try {
            setLoading(true);
            const [pData, colsData, tskList, membersData] = await Promise.all([
                fetchProjectById(projectId).catch(() => ({})),
                fetchColumnsByProject(projectId).catch(() => []),
                fetchTasksByProject(projectId).catch(() => []),
                fetchMembersByProject(projectId).catch(() => [])
            ]);

            const realProject = pData?.data || pData || {};
            const realColumns = Array.isArray(colsData) ? colsData : (colsData?.data || []);
            const realTasks = Array.isArray(tskList) ? tskList : (tskList?.data || []);
            const realMembers = Array.isArray(membersData)
                ? membersData
                : (membersData?.data || membersData?.members || []);

            realColumns.sort((a, b) => (a.position || 0) - (b.position || 0));

            const validColumnIds = new Set(
                realColumns.map(c => String(c._id || c.id)).filter(Boolean)
            );

            const projectStart = realProject.startDate || realProject.start_date || realProject.createdAt;
            const todoColumn = realColumns[0];
            const todoColumnId = todoColumn ? (todoColumn._id || todoColumn.id) : null;

            const backlogTasks = [];

            // Duyệt qua tất cả task trong Backlog
            for (const t of realTasks) {
                const rawCol = t.columnId;
                const cId = typeof rawCol === 'object' && rawCol !== null
                    ? (rawCol._id || rawCol.id)
                    : rawCol;

                const isBacklog = !cId || !validColumnIds.has(String(cId));

                if (isBacklog) {
                    // Kiểm tra xem task đã đến hạn theo Week chưa
                    if (todoColumnId && isTaskDueForBoard(t.week, projectStart)) {
                        // Tự động push sang board (Cột đầu tiên)
                        moveTask(t._id || t.id, {
                            sourceColumnId: null,
                            destColumnId: todoColumnId,
                            destinationIndex: 0
                        }).catch(err => console.error('Lỗi auto push task:', err));
                    } else {
                        backlogTasks.push(t);
                    }
                }
            }

            setProject(realProject);
            setColumns(realColumns);
            setTasks(backlogTasks);
            setProjectMembers(realMembers);
        } catch (err) {
            console.error('Error loading backlog tasks:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [projectId]);

    const totalProjectWeeks = useMemo(() => {
        if (!project) return 1;

        const start = project.startDate || project.createdDate || project.createdAt;
        const end = project.date || project.dueDate || project.endDate;

        if (!start || !end) return 1;

        const startDateObj = new Date(start);
        const endDateObj = new Date(end);

        const diffTime = endDateObj.getTime() - startDateObj.getTime();
        const diffDays = diffTime / (1000 * 3600 * 24);

        if (diffDays <= 0) return 1;

        return Math.ceil(diffDays / 7);
    }, [project]);

    const handleOpenCreateModal = () => {
        if (!isManager) return;
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskPriority('Medium');
        setNewTaskPoints(0);
        setNewTaskWeek(1);
        setActiveModal('quickCreateTaskModal');
    };

    const closeModal = () => {
        setActiveModal(null);
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!isManager || !newTaskTitle.trim()) return;

        try {
            setIsSubmitting(true);
            if (!projectId) return;

            const pointValue = Number(newTaskPoints) || 0;
            const weekValue = Number(newTaskWeek) || 1;

            const payload = {
                title: newTaskTitle,
                description: newTaskDesc,
                projectId: projectId,
                priority: newTaskPriority,
                point: pointValue,
                points: pointValue,
                week: weekValue,
                assignees: []
            };

            const response = await createTask(payload);
            const createdTask = response?.data || response;

            if (createdTask && (createdTask._id || createdTask.id)) {
                const projectStart = project?.startDate || project?.start_date || project?.createdAt;
                const todoColumn = columns[0];
                const todoColumnId = todoColumn ? (todoColumn._id || todoColumn.id) : null;

                // Nếu đến hạn luôn thì auto push sang Board
                if (todoColumnId && isTaskDueForBoard(weekValue, projectStart)) {
                    await moveTask(createdTask._id || createdTask.id, {
                        sourceColumnId: null,
                        destColumnId: todoColumnId,
                        destinationIndex: 0
                    });
                } else {
                    // Chưa đến hạn -> Giữ ở Backlog
                    setTasks(prevTasks => [createdTask, ...prevTasks]);
                }

                closeModal();
            }
        } catch (error) {
            console.error("Lỗi tạo task:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handlePushToBoard = async (task) => {
        if (!isLeader) return;
        const todoColumn = columns[0];
        if (!todoColumn) return;

        const taskId = task._id || task.id;
        const todoColumnId = todoColumn._id || todoColumn.id;

        try {
            setTasks(prev => prev.filter(t => (t._id || t.id) !== taskId));

            await moveTask(taskId, {
                sourceColumnId: null,
                destColumnId: todoColumnId,
                destinationIndex: 0
            });
        } catch (err) {
            console.error('Lỗi khi push task sang board:', err);
            loadData();
        }
    };

    // Định dạng ngày bắt đầu và ngày kết thúc theo chuẩn DD/MM/YYYY
    const formattedStartDate = formatDate(project?.startDate || project?.start_date || project?.createdAt);
    const formattedDueDate = formatDate(project?.date || project?.dueDate || project?.endDate);

    return (
        <div className="app-shell">
            <Sidebar
                collapsed={sidebarCollapsed}
                setCollapsed={setSidebarCollapsed}
                mobileOpen={sidebarMobileOpen}
                setMobileOpen={setSidebarMobileOpen}
            />

            <div className="app-main">
                <Header
                    onOpenSidebar={() => setSidebarMobileOpen(true)}
                    onOpenModal={(modal) => setActiveModal(modal)}
                />

                {loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, minHeight: '60vh', color: '#64748b', gap: '12px' }}>
                        <Loader2 className="animate-spin" style={{ width: 36, height: 36, color: '#4f46e5' }} />
                        <span style={{ fontSize: '15px', fontWeight: 500 }}>Loading...</span>
                    </div>
                ) : (
                    <>
                        <div className="project-header">
                            <div className="project-header-top">
                                <div style={{ minWidth: 0 }}>
                                    <div className="project-title-row">
                                        <span className="project-color-dot" style={{ background: project.color || '#4f46e5' }}></span>
                                        <h1>{project.name || 'Project'}</h1>
                                    </div>
                                    <p className="page-subtitle">{project.description || 'no description'}</p>

                                    <div className="project-meta-row" style={{ display: 'flex', gap: '16px', marginTop: '8px', fontSize: '13px', color: '#64748b', flexWrap: 'wrap' }}>
                                        <span className="project-meta-item"><UsersRound className="icon icon-sm" />{projectMembers.length} members</span>
                                        <span className="project-meta-item"><ListChecks className="icon icon-sm" />{tasks.length} tasks</span>
                                        <span className="project-meta-item"><CalendarClock className="icon icon-sm" />start date: {formattedStartDate}</span>
                                        <span className="project-meta-item"><CalendarClock className="icon icon-sm" />end date: {formattedDueDate}</span>
                                    </div>
                                </div>
                                <div className="project-header-actions">
                                    <Link to={`/projectsetting/${projectId}`} className="icon-btn icon-btn-outline">
                                        <Settings className="icon" />
                                    </Link>
                                </div>
                            </div>

                            <nav className="project-tabs">
                                <Link to={`/projectoverview/${projectId}`} className="project-tab">
                                    <Info className="icon icon-sm" /> Overview
                                </Link>
                                <Link to={`/projectchart/${projectId}`} className="project-tab">
                                    <BarChart2 className="icon icon-sm" /> Chart
                                </Link>
                                <Link to={`/projectboard/${projectId}`} className="project-tab">
                                    <LayoutGrid className="icon icon-sm" /> Board
                                </Link>
                                <Link to={`/projectlist/${projectId}`} className="project-tab active">
                                    <List className="icon icon-sm" /> Backlog
                                </Link>
                                <Link to={`/projectcalendar/${projectId}`} className="project-tab">
                                    <Calendar className="icon icon-sm" /> Calendar
                                </Link>
                            </nav>
                        </div>

                        <main className="page-content" style={{ padding: '20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <div>
                                    <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>Pending Backlog Tasks</h2>
                                </div>
                                {isManager && (
                                    <button onClick={handleOpenCreateModal} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <Plus className="w-4 h-4" /> Add Task
                                    </button>
                                )}
                            </div>

                            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'visible' }}>
                                <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '14px' }}>
                                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#64748b', fontWeight: 600 }}>
                                    <tr>
                                        <th style={{ padding: '12px 16px' }}>Title</th>
                                        <th style={{ padding: '12px 16px' }}>Priority</th>
                                        <th style={{ padding: '12px 16px' }}>Points</th>
                                        <th style={{ padding: '12px 16px' }}>Week</th>
                                        <th style={{ padding: '12px 16px', textAlign: 'right' }}>Actions</th>
                                    </tr>
                                    </thead>
                                    <tbody>
                                    {tasks.length > 0 ? (
                                        tasks.map((task, index) => {
                                            const taskId = task._id || task.id || `task-fallback-${index}`;
                                            const displayTitle = task.title || task.name || 'Untitled Task';
                                            const taskPoints = task.points ?? task.point ?? 0;
                                            const taskWeek = task.week || 1;

                                            return (
                                                <tr key={taskId} style={{ borderBottom: '1px solid #f1f5f9' }}>
                                                    <td style={{ padding: '12px 16px', fontWeight: 500, color: '#1e293b' }}>
                                                        <div>{displayTitle}</div>
                                                        {task.description && (
                                                            <div style={{ fontSize: '12px', color: '#94a3b8', marginTop: '2px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '320px' }}>
                                                                {task.description}
                                                            </div>
                                                        )}
                                                    </td>

                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{ padding: '2px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: '#fffbeb', color: '#d97706' }}>
                                                            {task.priority || 'Medium'}
                                                        </span>
                                                    </td>

                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{ padding: '2px 8px', borderRadius: '12px', fontSize: '12px', fontWeight: 600, background: '#f1f5f9', color: '#475569' }}>
                                                            {taskPoints} pts
                                                        </span>
                                                    </td>

                                                    <td style={{ padding: '12px 16px' }}>
                                                        <span style={{
                                                            background: '#e0e7ff',
                                                            color: '#3730a3',
                                                            border: '1px solid #c7d2fe',
                                                            borderRadius: '12px',
                                                            padding: '2px 8px',
                                                            fontSize: '12px',
                                                            fontWeight: 600,
                                                            display: 'inline-block'
                                                        }}>
                                                            Week {taskWeek}
                                                        </span>
                                                    </td>

                                                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                                                            {(isLeader) && (
                                                                <button
                                                                    onClick={() => handlePushToBoard(task)}
                                                                    className="btn btn-primary btn-sm"
                                                                    style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}
                                                                >
                                                                    <ArrowRightCircle className="w-3.5 h-3.5" />
                                                                    Push to Board
                                                                </button>
                                                            )}

                                                            {isManager && (
                                                                <button
                                                                    onClick={() => handleDeleteTask(taskId)}
                                                                    className="btn btn-danger btn-sm"
                                                                    style={{
                                                                        display: 'inline-flex',
                                                                        alignItems: 'center',
                                                                        gap: '4px',
                                                                        fontSize: '12px',
                                                                        backgroundColor: '#ef4444',
                                                                        color: '#fff',
                                                                        padding: '4px 8px',
                                                                        borderRadius: '4px',
                                                                        border: 'none',
                                                                        cursor: 'pointer'
                                                                    }}
                                                                    title="Delete task"
                                                                >
                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                    Delete
                                                                </button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    ) : (
                                        <tr>
                                            <td colSpan="5" style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                                                No pending backlog tasks.
                                            </td>
                                        </tr>
                                    )}
                                    </tbody>
                                </table>
                            </div>
                        </main>
                    </>
                )}
            </div>

            {/* CREATE TASK MODAL */}
            {isManager && activeModal === 'quickCreateTaskModal' && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <form onSubmit={handleCreateTask}>
                            <div className="modal-header">
                                <h2>Add Task to Backlog</h2>
                                <button type="button" className="btn-icon" onClick={closeModal}>✕</button>
                            </div>
                            <div className="modal-body">
                                <div className="form-group">
                                    <label className="form-label">Title *</label>
                                    <input
                                        className="input"
                                        placeholder="e.g: My task"
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        required
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Points</label>
                                    <input
                                        type="number"
                                        min="0"
                                        className="input"
                                        placeholder="0"
                                        value={newTaskPoints}
                                        onChange={(e) => setNewTaskPoints(e.target.value === '' ? '' : Number(e.target.value))}
                                    />
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Week</label>
                                    <select
                                        className="select"
                                        value={newTaskWeek}
                                        onChange={(e) => setNewTaskWeek(Number(e.target.value))}
                                        style={{ cursor: 'pointer' }}
                                    >
                                        {Array.from({ length: totalProjectWeeks }, (_, i) => i + 1).map(w => (
                                            <option key={w} value={w}>Week {w}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Priority</label>
                                    <select
                                        className="select"
                                        value={newTaskPriority}
                                        onChange={(e) => setNewTaskPriority(e.target.value)}
                                    >
                                        <option value="Low">Low</option>
                                        <option value="Medium">Medium</option>
                                        <option value="High">High</option>
                                        <option value="Urgent">Urgent</option>
                                    </select>
                                </div>

                                <div className="form-group">
                                    <label className="form-label">Description</label>
                                    <textarea
                                        className="textarea"
                                        placeholder="Add task description..."
                                        value={newTaskDesc}
                                        onChange={(e) => setNewTaskDesc(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-secondary" onClick={closeModal}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
                                    {isSubmitting ? 'Adding...' : 'Add'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}