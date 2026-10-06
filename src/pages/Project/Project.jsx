import React, { useState, useEffect } from 'react';
import "./project.css";

import {
    Plus,
    X,
    ListChecks,
    UsersRound,
    CalendarClock,
    Loader2
} from 'lucide-react';
import SideBar from './../../components/layout/SideBar/SideBar';
import Header from './../../components/layout/Header/Header';
import {
    fetchProjects,
    createProject,
    fetchMembers,
    createTask,
    fetchTasksByProject,
    fetchMembersByProject
} from './../../../api.jsx';
import { Link } from "react-router-dom";

const COLOR_OPTIONS = [
    '#4f46e5',
    '#0ea5e9',
    '#16a34a',
    '#f59e0b',
    '#db2777',
    '#9333ea',
    '#0d9488',
    '#dc2626'
];

// Hàm lấy ngày hiện tại dạng YYYY-MM-DD theo giờ địa phương
const getTodayString = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

const getInitials = (name) => {
    if (!name) return '??';
    const words = String(name).trim().split(/\s+/);
    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const getMemberDisplayName = (member) => {
    if (!member) return 'User';
    if (typeof member === 'object') {
        if (member.userId && typeof member.userId === 'object') {
            return member.userId.username || member.userId.name || member.userId.email || 'User';
        }
        return member.username || member.name || member.email || 'User';
    }
    return 'User';
};

// Hàm tính toán trạng thái badge dựa trên End Date
const getProjectStatus = (dueDateStr) => {
    if (!dueDateStr) return { label: 'On track', class: 'badge-success' };

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const endDate = new Date(dueDateStr);
    endDate.setHours(0, 0, 0, 0);

    // Tính chênh lệch số ngày
    const diffTime = endDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return { label: 'Overdue', class: 'badge-danger' };
    } else if (diffDays <= 1) {
        return { label: 'Expiring', class: 'badge-warning' };
    }

    return { label: 'On track', class: 'badge-success' };
};

export default function Projects() {
    const todayStr = getTodayString();

    const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
    const [activeModal, setActiveModal] = useState(null);

    const [projects, setProjects] = useState([]);
    const [members, setMembers] = useState([]);

    const [projectTaskStats, setProjectTaskStats] = useState({});
    const [projectMembersMap, setProjectMembersMap] = useState({});

    const [loadingProjects, setLoadingProjects] = useState(true);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [isSubmittingProject, setIsSubmittingProject] = useState(false);
    const [isSubmittingTask, setIsSubmittingTask] = useState(false);

    const [projectName, setProjectName] = useState('');
    const [projectDesc, setProjectDesc] = useState('');
    const [projectStartDate, setProjectStartDate] = useState(todayStr);
    const [projectDueDate, setProjectDueDate] = useState('');
    const [selectedColor, setSelectedColor] = useState('#4f46e5');
    const [selectedMembers, setSelectedMembers] = useState([]);

    const [taskTitle, setTaskTitle] = useState('');
    const [taskProject, setTaskProject] = useState('');
    const [taskColumn, setTaskColumn] = useState('Todo');
    const [taskPriority, setTaskPriority] = useState('Medium');
    const [taskDueDate, setTaskDueDate] = useState('');

    const [toasts, setToasts] = useState([]);

    const getCurrentUser = () => {
        try {
            const raw = JSON.parse(localStorage.getItem('user') || localStorage.getItem('member') || '{}');
            return raw?.user || raw?.data || raw;
        } catch (e) {
            return {};
        }
    };

    const currentUser = getCurrentUser();
    const currentUserId = currentUser._id || currentUser.id || null;

    const currentMemberRecord = members.find(m => {
        const uId = m.userId?._id || m.userId?.id || m.userId || m._id || m.id;
        return String(uId) === String(currentUserId);
    });

    const userRoleInUserTable = currentUser?.role;
    const userRoleInMemberTable = currentMemberRecord?.role;
    const currentUserRole = userRoleInMemberTable || userRoleInUserTable || 'Member';

    const isAdmin = String(userRoleInUserTable).toLowerCase() === 'admin';
    const isManager = currentUserRole === 'Manager';
    const canCreateProject = isAdmin ;

    const resetProjectForm = () => {
        const currentToday = getTodayString();
        setProjectName('');
        setProjectDesc('');
        setProjectStartDate(currentToday);
        setProjectDueDate('');
        setSelectedColor('#4f46e5');
        setSelectedMembers([]);
    };

    const closeModal = () => {
        setActiveModal(null);
        resetProjectForm();
    };

    const loadProjects = async () => {
        setLoadingProjects(true);
        try {
            const data = await fetchProjects();
            const list = Array.isArray(data) ? data : (data?.data || []);

            setProjects(list);
            if (list.length > 0) {
                setTaskProject(list[0]._id || list[0].id);
            }

            const statsMap = {};
            const membersMap = {};

            await Promise.all(
                list.map(async (project) => {
                    const pId = project._id || project.id;

                    try {
                        const tasksData = await fetchTasksByProject(pId);
                        const tasksList = Array.isArray(tasksData) ? tasksData : (tasksData?.data || []);

                        const doneTasksCount = tasksList.filter((task) => {
                            if (task.columnId && typeof task.columnId === 'object') {
                                return task.columnId.position === 3;
                            }
                            if (task.position === 3) {
                                return true;
                            }
                            return false;
                        }).length;

                        statsMap[pId] = {
                            total: tasksList.length,
                            done: doneTasksCount
                        };
                    } catch (err) {
                        statsMap[pId] = { total: 0, done: 0 };
                    }

                    try {
                        const projectMembersData = await fetchMembersByProject(pId);
                        const realMembers = Array.isArray(projectMembersData)
                            ? projectMembersData
                            : (projectMembersData?.data || projectMembersData?.members || []);
                        membersMap[pId] = realMembers;
                    } catch (err) {
                        membersMap[pId] = Array.isArray(project.assignees)
                            ? project.assignees
                            : (Array.isArray(project.members) ? project.members : []);
                    }
                })
            );

            setProjectTaskStats(statsMap);
            setProjectMembersMap(membersMap);

        } catch (error) {
            console.error("Lỗi fetch projects:", error);
            showToast('Lỗi', 'Không thể tải danh sách Projects.', 'error');
        } finally {
            setLoadingProjects(false);
        }
    };

    const loadMembers = async () => {
        setLoadingMembers(true);
        try {
            const data = await fetchMembers();
            const list = Array.isArray(data) ? data : (data?.data || data?.users || []);
            setMembers(list);
        } catch (error) {
            console.error("Lỗi fetch members:", error);
            showToast('Lỗi', 'Không thể tải danh sách Members.', 'error');
        } finally {
            setLoadingMembers(false);
        }
    };

    useEffect(() => {
        loadProjects();
        loadMembers();
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault();
                setActiveModal('commandPalette');
            }
            if (e.key === 'Escape') {
                setActiveModal(null);
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    const showToast = (title, description = null, variant = 'info') => {
        const id = Date.now();
        setToasts((prev) => [...prev, { id, title, description, variant }]);
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id));
        }, 4000);
    };

    const calculateProgress = (project) => {
        const pId = project._id || project.id;
        const stats = projectTaskStats[pId];

        if (stats && stats.total > 0) {
            return Math.round((stats.done / stats.total) * 100);
        }

        return 0;
    };

    const getTaskCount = (project) => {
        const pId = project._id || project.id;
        if (projectTaskStats[pId] !== undefined) {
            return projectTaskStats[pId].total;
        }
        return 0;
    };

    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!canCreateProject) return;

        const currentToday = getTodayString();

        if (projectStartDate && projectStartDate < currentToday) {
            showToast('Lỗi', 'Start date không được là ngày trong quá khứ.', 'error');
            return;
        }

        if (projectDueDate && projectDueDate < currentToday) {
            showToast('Lỗi', 'End date không được là ngày trong quá khứ.', 'error');
            return;
        }

        if (projectStartDate && projectDueDate && projectStartDate > projectDueDate) {
            showToast('Lỗi', 'Start date không được sau End date.', 'error');
            return;
        }

        setIsSubmittingProject(true);
        try {
            const validAssignees = selectedMembers.filter(
                (id) => typeof id === 'string' && id.trim().length > 0
            );

            if (currentUserId && !validAssignees.includes(currentUserId)) {
                validAssignees.push(currentUserId);
            }

            const payload = {
                name: projectName.trim(),
                description: projectDesc.trim(),
                color: selectedColor,
                userId: currentUserId,
                startDate: projectStartDate || currentToday,
                date: projectDueDate || currentToday,
                assignees: validAssignees
            };

            await createProject(payload);

            showToast('Project created', 'Project đã lưu thành công.', 'success');
            closeModal();
            loadProjects();
        } catch (error) {
            console.error("Lỗi tạo Project:", error);
            showToast('Lỗi', error.response?.data?.message || error.message || 'Không thể tạo project.', 'error');
        } finally {
            setIsSubmittingProject(false);
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        const currentToday = getTodayString();

        if (taskDueDate && taskDueDate < currentToday) {
            showToast('Lỗi', 'End date không được là ngày trong quá khứ.', 'error');
            return;
        }

        setIsSubmittingTask(true);
        try {
            await createTask({
                title: taskTitle,
                projectId: taskProject,
                column: taskColumn,
                priority: taskPriority,
                dueDate: taskDueDate
            });
            showToast('Task created', 'Task mới đã tạo thành công.', 'success');
            setTaskTitle('');
            setTaskDueDate('');
            setActiveModal(null);
            loadProjects();
        } catch (error) {
            showToast('Lỗi', 'Không thể tạo task.', 'error');
        } finally {
            setIsSubmittingTask(false);
        }
    };

    return (
        <div className="app-shell">
            <SideBar />

            {sidebarMobileOpen && (
                <div
                    className="sidebar-overlay show"
                    onClick={() => setSidebarMobileOpen(false)}
                />
            )}

            <div className="app-main">
                <Header />

                <main className="page-content">
                    <div className="page-content-inner">
                        <div className="page-header">
                            <div>
                                <h1>Projects</h1>
                                <p className="page-subtitle">
                                    All the boards your team is working on.
                                </p>
                            </div>

                            {canCreateProject && (
                                <button
                                    className="btn btn-primary"
                                    style={{ cursor: 'pointer' }}
                                    onClick={() => {
                                        resetProjectForm();
                                        setActiveModal('createProjectModal');
                                    }}
                                >
                                    <Plus className="icon icon-sm" />
                                    Create Project
                                </button>
                            )}
                        </div>

                        {loadingProjects ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '64px 0', gap: '12px', color: '#6b7280' }}>
                                <Loader2 className="animate-spin" size={36} style={{ color: '#4f46e5' }} />
                                <span style={{ fontSize: '15px', fontWeight: 500 }}>Loading...</span>
                            </div>
                        ) : projects.length === 0 ? (
                            <div className="empty-state" style={{ padding: '48px 0', textAlign: 'center' }}>
                                <p className="empty-state-title" style={{ fontSize: '16px', color: '#6b7280' }}>
                                    {canCreateProject ? 'Create your first project!' : 'No projects found.'}
                                </p>
                            </div>
                        ) : (
                            <div className="grid-cards">
                                {projects.map((project) => {
                                    const pId = project._id || project.id;
                                    const memberList = projectMembersMap[pId] || [];
                                    const totalTask = getTaskCount(project);
                                    const progressPercent = calculateProgress(project);
                                    const statusObj = getProjectStatus(project.date || project.dueDate);

                                    return (
                                        <Link
                                            key={pId}
                                            to={`/projectoverview/${pId}`}
                                            className="card project-card"
                                        >
                                            <div className="project-card-top">
                                                <div className="project-title-row">
                                                    <span
                                                        className="project-color-dot"
                                                        style={{ background: project.color || '#4f46e5' }}
                                                    ></span>
                                                    <span className="project-card-name">{project.name}</span>
                                                </div>
                                                <span className={`badge ${statusObj.class}`}>
                                                    {statusObj.label}
                                                </span>
                                            </div>
                                            <p className="project-card-desc">{project.description || project.desc}</p>
                                            <div>
                                                <div className="project-card-progress-row">
                                                    <span className="icon-inline">
                                                        <ListChecks className="icon icon-sm" />
                                                        {totalTask} {totalTask === 1 ? 'task' : 'tasks'}
                                                    </span>
                                                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                                        {progressPercent}%
                                                    </span>
                                                </div>

                                                <div
                                                    style={{
                                                        width: '100%',
                                                        height: '10px',
                                                        backgroundColor: '#e2e8f0',
                                                        borderRadius: '999px',
                                                        overflow: 'hidden',
                                                        marginTop: '8px'
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            width: `${progressPercent}%`,
                                                            height: '100%',
                                                            backgroundColor: progressPercent === 100
                                                                ? '#10b981'
                                                                : progressPercent >= 50
                                                                    ? '#3b82f6'
                                                                    : '#f59e0b',
                                                            borderRadius: '999px',
                                                            transition: 'width 0.4s ease-in-out',
                                                            boxShadow: progressPercent > 0 ? '0 0 8px rgba(59, 130, 246, 0.5)' : 'none'
                                                        }}
                                                    />
                                                </div>
                                            </div>

                                            <div className="project-card-footer">
                                                <span className="avatar-group" style={{ display: 'flex', alignItems: 'center' }}>
                                                    {memberList.slice(0, 4).map((member, index) => {
                                                        const displayName = getMemberDisplayName(member);
                                                        const initials = getInitials(displayName);

                                                        return (
                                                            <span
                                                                key={member._id || member.id || index}
                                                                className="avatar avatar-xs"
                                                                style={{
                                                                    background: '#4f46e5',
                                                                    color: '#ffffff',
                                                                    fontWeight: 600,
                                                                    fontSize: '11px',
                                                                    marginLeft: index > 0 ? '-6px' : '0',
                                                                    border: '2px solid #ffffff',
                                                                    borderRadius: '50%',
                                                                    width: '24px',
                                                                    height: '24px',
                                                                    display: 'inline-flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'center'
                                                                }}
                                                                title={displayName}
                                                            >
                                                                {initials}
                                                            </span>
                                                        );
                                                    })}
                                                    {memberList.length > 4 && (
                                                        <span
                                                            className="avatar avatar-xs"
                                                            style={{
                                                                background: '#9ca3af',
                                                                color: '#ffffff',
                                                                fontSize: '10px',
                                                                fontWeight: 600,
                                                                marginLeft: '-6px',
                                                                border: '2px solid #ffffff',
                                                                borderRadius: '50%',
                                                                width: '24px',
                                                                height: '24px',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center'
                                                            }}
                                                        >
                                                            +{memberList.length - 4}
                                                        </span>
                                                    )}
                                                </span>

                                                <span className="project-card-footer-meta">
                                                    <span className="icon-inline" title="Total Members">
                                                        <UsersRound className="icon icon-sm" />
                                                        {memberList.length}
                                                    </span>
                                                    <span className="icon-inline">
                                                        <CalendarClock className="icon icon-sm" />
                                                        {(project.date || project.dueDate)
                                                            ? new Date(project.date || project.dueDate).toLocaleDateString('vi-VN')
                                                            : 'N/A'}
                                                    </span>
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            {/* Modal Create Task */}
            {activeModal === 'quickCreateTaskModal' && (
                <div className="modal-overlay" onClick={() => setActiveModal(null)}>
                    <div className="modal-box" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2 className="modal-title">Create task</h2>
                            <button className="icon-btn" onClick={() => setActiveModal(null)} aria-label="Close" style={{ cursor: 'pointer' }}>
                                <X className="icon" />
                            </button>
                        </div>
                        <form onSubmit={handleCreateTask}>
                            <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                                <div className="field">
                                    <label className="field-label">Title</label>
                                    <input
                                        className="input"
                                        placeholder="e.g. Fix pagination bug"
                                        required
                                        autoFocus
                                        value={taskTitle}
                                        onChange={(e) => setTaskTitle(e.target.value)}
                                    />
                                </div>
                                <div className="grid-2">
                                    <div className="field">
                                        <label className="field-label">Project</label>
                                        <select className="select" value={taskProject} onChange={(e) => setTaskProject(e.target.value)}>
                                            {projects.map((p) => (
                                                <option key={p._id || p.id} value={p._id || p.id}>
                                                    {p.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="field">
                                        <label className="field-label">Column</label>
                                        <select className="select" value={taskColumn} onChange={(e) => setTaskColumn(e.target.value)}>
                                            <option value="Todo">Todo</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Review">Review</option>
                                            <option value="Done">Done</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid-2">
                                    <div className="field">
                                        <label className="field-label">Priority</label>
                                        <select className="select" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                                            <option value="Medium">Medium</option>
                                            <option value="Urgent">Urgent</option>
                                            <option value="High">High</option>
                                            <option value="Low">Low</option>
                                        </select>
                                    </div>
                                    <div className="field">
                                        <label className="field-label">End date</label>
                                        <input
                                            className="input"
                                            type="date"
                                            min={getTodayString()}
                                            value={taskDueDate}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const currentToday = getTodayString();
                                                if (val && val < currentToday) {
                                                    showToast('Lỗi', 'End date không được là ngày trong quá khứ.', 'error');
                                                    setTaskDueDate(currentToday);
                                                } else {
                                                    setTaskDueDate(val);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline btn-sm" onClick={() => setActiveModal(null)} style={{ cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmittingTask} style={{ cursor: isSubmittingTask ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {isSubmittingTask ? (
                                        <>
                                            <Loader2 className="animate-spin" size={14} />
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        'Create task'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Create Project */}
            {canCreateProject && activeModal === 'createProjectModal' && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div
                        className="modal-box"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            width: '100%',
                            maxWidth: '640px',
                            maxHeight: '85vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden'
                        }}
                    >
                        <div className="modal-header" style={{ flexShrink: 0, padding: '20px 24px 16px' }}>
                            <div>
                                <h2 className="modal-title">Create project</h2>
                                <p className="modal-desc">Set up a new board for your team.</p>
                            </div>
                            <button className="icon-btn" onClick={closeModal} aria-label="Close" style={{ cursor: 'pointer' }}>
                                <X className="icon" />
                            </button>
                        </div>

                        <form
                            onSubmit={handleCreateProject}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1,
                                overflow: 'hidden'
                            }}
                        >
                            <div
                                className="modal-body"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--space-4)',
                                    overflowY: 'auto',
                                    padding: '0 24px 8px',
                                    flex: 1
                                }}
                            >
                                <div className="field">
                                    <label className="field-label">Name</label>
                                    <input
                                        className="input"
                                        placeholder="e.g. Growth Experiments"
                                        required
                                        autoFocus
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                    />
                                </div>
                                <div className="field">
                                    <label className="field-label">Description</label>
                                    <input
                                        className="textarea"
                                        placeholder="What is this project about?"
                                        value={projectDesc}
                                        onChange={(e) => setProjectDesc(e.target.value)}
                                    ></input>
                                </div>

                                <div className="grid-2">
                                    <div className="field">
                                        <label className="field-label">Start date</label>
                                        <input
                                            className="input"
                                            type="date"
                                            min={getTodayString()}
                                            value={projectStartDate}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const currentToday = getTodayString();
                                                if (val && val < currentToday) {
                                                    showToast('Lỗi', 'Start date không được là ngày trong quá khứ.', 'error');
                                                    setProjectStartDate(currentToday);
                                                } else {
                                                    setProjectStartDate(val);
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="field">
                                        <label className="field-label">End date</label>
                                        <input
                                            className="input"
                                            type="date"
                                            min={projectStartDate || getTodayString()}
                                            value={projectDueDate}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const minAllowed = projectStartDate || getTodayString();
                                                if (val && val < minAllowed) {
                                                    showToast('Lỗi', 'End date không được nhỏ hơn Start date hoặc ngày hiện tại.', 'error');
                                                    setProjectDueDate(minAllowed);
                                                } else {
                                                    setProjectDueDate(val);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="field">
                                    <span className="field-label">Color</span>
                                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                        {COLOR_OPTIONS.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                aria-label="Color"
                                                onClick={() => setSelectedColor(color)}
                                                style={{
                                                    width: '24px',
                                                    height: '24px',
                                                    borderRadius: '50%',
                                                    background: color,
                                                    border: 'none',
                                                    cursor: 'pointer',
                                                    boxShadow: selectedColor === color ? `0 0 0 2px #fff, 0 0 0 4px ${color}` : 'none'
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer" style={{ flexShrink: 0, padding: '16px 24px 20px' }}>
                                <button type="button" className="btn btn-outline btn-sm" onClick={closeModal} style={{ cursor: 'pointer' }}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmittingProject} style={{ cursor: isSubmittingProject ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {isSubmittingProject ? (
                                        <>
                                            <Loader2 className="animate-spin" size={14} />
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        'Create project'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}