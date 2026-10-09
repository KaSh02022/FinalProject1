import React, { useState, useEffect } from 'react';
import "./project.css";

import {
    Plus,
    ListChecks,
    UsersRound,
    CalendarClock,
    Loader2
} from 'lucide-react';
import {
    fetchProjects,
    createProject,
    fetchMembers,
    createTask,
    fetchTasksByProject,
    fetchMembersByProject
} from './../../../api.jsx';
import { Link } from "react-router-dom";
import ErrorState from '../../components/common/ErrorState.jsx';
import { failureMessage } from '../../utils/requestState.js';
import { avatarToneClass } from "../../utils/avatar.js";
import { notify } from "../../utils/notify.js";
import { buildFinancePayload } from '../../utils/projectFinance.js';
import Modal from '../../components/common/Modal.jsx';

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

    const [activeModal, setActiveModal] = useState(null);

    const [projects, setProjects] = useState([]);
    const [members, setMembers] = useState([]);

    // per project: { status: 'loading' | 'success' | 'error', total, done } — a failed count is shown as "—", never 0
    const [projectTaskStats, setProjectTaskStats] = useState({});
    const [retryingStats, setRetryingStats] = useState(false);
    const [projectMembersMap, setProjectMembersMap] = useState({});

    const [loadingProjects, setLoadingProjects] = useState(true);
    // Set when the project list request fails: show an error, not "No projects found"
    const [projectsError, setProjectsError] = useState(null);
    const [loadingMembers, setLoadingMembers] = useState(false);
    const [isSubmittingProject, setIsSubmittingProject] = useState(false);
    const [isSubmittingTask, setIsSubmittingTask] = useState(false);

    const [projectName, setProjectName] = useState('');
    const [projectDesc, setProjectDesc] = useState('');
    const [projectStartDate, setProjectStartDate] = useState(todayStr);
    const [projectDueDate, setProjectDueDate] = useState('');
    // Budget / Cost per Point as typed (strings; empty = not sent)
    const [projectFinance, setProjectFinance] = useState({ budget: '', costPerPoint: '' });
    const [selectedColor, setSelectedColor] = useState('#4f46e5');
    const [selectedMembers, setSelectedMembers] = useState([]);

    const [taskTitle, setTaskTitle] = useState('');
    const [taskProject, setTaskProject] = useState('');
    const [taskColumn, setTaskColumn] = useState('Todo');
    const [taskPriority, setTaskPriority] = useState('Medium');
    const [taskDueDate, setTaskDueDate] = useState('');


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
        setProjectFinance({ budget: '', costPerPoint: '' });
        setSelectedColor('#4f46e5');
        setSelectedMembers([]);
    };

    const closeModal = () => {
        setActiveModal(null);
        resetProjectForm();
    };

    // Task count + done count of one project (same request and "done" rule as before)
    const loadTaskStats = async (pId) => {
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

            return { status: 'success', total: tasksList.length, done: doneTasksCount };
        } catch (err) {
            console.error("Lỗi fetch tasks của project:", pId, err);
            return { status: 'error', error: err };
        }
    };

    // Retry only the projects whose count failed; their cards show a spinner meanwhile
    const retryFailedStats = async () => {
        const failedIds = Object.keys(projectTaskStats).filter((id) => projectTaskStats[id]?.status === 'error');
        if (failedIds.length === 0) return;
        setRetryingStats(true);
        setProjectTaskStats((prev) => {
            const next = { ...prev };
            failedIds.forEach((id) => { next[id] = { status: 'loading' }; });
            return next;
        });
        const results = await Promise.all(failedIds.map(async (id) => [id, await loadTaskStats(id)]));
        setProjectTaskStats((prev) => ({ ...prev, ...Object.fromEntries(results) }));
        setRetryingStats(false);
    };

    const loadProjects = async () => {
        setLoadingProjects(true);
        setProjectsError(null);
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

                    statsMap[pId] = await loadTaskStats(pId);

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
            setProjectsError(error);
            // the page shows ErrorState + Retry for this failure (no extra toast)
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
            showToast('Error', 'The member list could not be loaded.', 'error');
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

    // the page's toasts were kept in state but never rendered: they now go to the shared notifier
    const showToast = (title, description = null, variant = 'info') => {
        notify({ type: variant, title, message: description || '' });
    };

    // null = not known (still loading or the request failed)
    const calculateProgress = (project) => {
        const pId = project._id || project.id;
        const stats = projectTaskStats[pId];
        if (stats?.status !== 'success') return null;

        if (stats.total > 0) {
            return Math.round((stats.done / stats.total) * 100);
        }

        return 0;
    };

    const getTaskCount = (project) => {
        const pId = project._id || project.id;
        const stats = projectTaskStats[pId];
        return stats?.status === 'success' ? stats.total : null;
    };

    const failedStatsCount = Object.values(projectTaskStats).filter((st) => st?.status === 'error').length;

    const handleCreateProject = async (e) => {
        e.preventDefault();
        if (!canCreateProject) return;

        const currentToday = getTodayString();

        if (projectStartDate && projectStartDate < currentToday) {
            showToast('Error', 'The start date cannot be in the past.', 'error');
            return;
        }

        if (projectDueDate && projectDueDate < currentToday) {
            showToast('Error', 'The end date cannot be in the past.', 'error');
            return;
        }

        if (projectStartDate && projectDueDate && projectStartDate > projectDueDate) {
            showToast('Error', 'The start date cannot be after the end date.', 'error');
            return;
        }

        const finance = buildFinancePayload(projectFinance);
        if (finance.error) {
            showToast('Error', finance.error, 'error');
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
                assignees: validAssignees,
                ...finance.payload
            };

            await createProject(payload);

            showToast('Project created', 'The project has been saved.', 'success');
            closeModal();
            loadProjects();
        } catch (error) {
            console.error("Lỗi tạo Project:", error);
            showToast('Error', error.message || 'The project could not be created.', 'error');
        } finally {
            setIsSubmittingProject(false);
        }
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        const currentToday = getTodayString();

        if (taskDueDate && taskDueDate < currentToday) {
            showToast('Error', 'The end date cannot be in the past.', 'error');
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
            showToast('Task created', 'The new task has been created.', 'success');
            setTaskTitle('');
            setTaskDueDate('');
            setActiveModal(null);
            loadProjects();
        } catch (error) {
            showToast('Error', 'The task could not be created.', 'error');
        } finally {
            setIsSubmittingTask(false);
        }
    };

    return (
        <>

                <main className="page-content">
                    <div className="page-content-inner projects-page">
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
                        ) : projectsError ? (
                            <ErrorState
                                title="Couldn't load projects"
                                message={failureMessage({ error: projectsError })}
                                onRetry={loadProjects}
                            />
                        ) : projects.length === 0 ? (
                            <div className="empty-state" style={{ padding: '48px 0', textAlign: 'center' }}>
                                <p className="empty-state-title" style={{ fontSize: '16px', color: '#6b7280' }}>
                                    {canCreateProject ? 'Create your first project!' : 'No projects found.'}
                                </p>
                            </div>
                        ) : (
                            <>
                            {failedStatsCount > 0 && (
                                <ErrorState
                                    variant="inline"
                                    title="Couldn't load task counts."
                                    message={`${failedStatsCount} ${failedStatsCount === 1 ? 'project shows' : 'projects show'} “—” instead of a number.`}
                                    onRetry={retryFailedStats}
                                    retrying={retryingStats}
                                />
                            )}
                            <div className="grid-cards">
                                {projects.map((project) => {
                                    const pId = project._id || project.id;
                                    const memberList = projectMembersMap[pId] || [];
                                    const statsStatus = projectTaskStats[pId]?.status || 'loading';
                                    const totalTask = getTaskCount(project);
                                    const progressValue = calculateProgress(project);
                                    const progressPercent = progressValue ?? 0;
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
                                                    {statsStatus === 'success' ? (
                                                        <span className="icon-inline">
                                                            <ListChecks className="icon icon-sm" />
                                                            {totalTask} {totalTask === 1 ? 'task' : 'tasks'}
                                                        </span>
                                                    ) : statsStatus === 'error' ? (
                                                        <span className="icon-inline project-stats-error" title="Couldn't load the task count">
                                                            <ListChecks className="icon icon-sm" />
                                                            <span aria-hidden="true">—</span>
                                                            <span className="sr-only">Task count unavailable</span>
                                                        </span>
                                                    ) : (
                                                        <span className="icon-inline project-stats-loading" role="status">
                                                            <Loader2 className="icon icon-sm animate-spin" aria-hidden="true" />
                                                            <span className="sr-only">Loading task count</span>
                                                        </span>
                                                    )}
                                                    <span style={{ fontWeight: 700, color: '#0f172a' }}>
                                                        {progressValue === null ? '—' : `${progressPercent}%`}
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
                                                <span className="avatar-group">
                                                    {memberList.slice(0, 4).map((member, index) => {
                                                        const displayName = getMemberDisplayName(member);
                                                        const initials = getInitials(displayName);
                                                        // same color seed as task cards / drawer: the USER id (KI-26)
                                                        const userId = typeof member.userId === 'object'
                                                            ? (member.userId?._id || member.userId?.id)
                                                            : (member.userId || member._id || member.id);

                                                        return (
                                                            <span
                                                                key={member._id || member.id || index}
                                                                className={`avatar avatar-sm ${avatarToneClass(userId)}`}
                                                                title={displayName}
                                                            >
                                                                {initials}
                                                            </span>
                                                        );
                                                    })}
                                                    {memberList.length > 4 && (
                                                        <span className="avatar-overflow avatar-sm">
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
                                                            ? new Date(project.date || project.dueDate).toLocaleDateString('en-GB')
                                                            : 'N/A'}
                                                    </span>
                                                </span>
                                            </div>
                                        </Link>
                                    );
                                })}
                            </div>
                            </>
                        )}
                    </div>
                </main>

            {/* Modal Create Task */}
            {activeModal === 'quickCreateTaskModal' && (
                <Modal title="Create task" onClose={() => setActiveModal(null)}>
                        <form className="modal-form" onSubmit={handleCreateTask}>
                            <div className="modal-body">
                                <div className="field">
                                    <label className="field-label" htmlFor="quick-task-title">Title</label>
                                    <input id="quick-task-title"
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
                                        <label className="field-label" htmlFor="quick-task-project">Project</label>
                                        <select id="quick-task-project" className="select" value={taskProject} onChange={(e) => setTaskProject(e.target.value)}>
                                            {projects.map((p) => (
                                                <option key={p._id || p.id} value={p._id || p.id}>
                                                    {p.name}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                    <div className="field">
                                        <label className="field-label" htmlFor="quick-task-column">Column</label>
                                        <select id="quick-task-column" className="select" value={taskColumn} onChange={(e) => setTaskColumn(e.target.value)}>
                                            <option value="Todo">Todo</option>
                                            <option value="In Progress">In Progress</option>
                                            <option value="Review">Review</option>
                                            <option value="Done">Done</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid-2">
                                    <div className="field">
                                        <label className="field-label" htmlFor="quick-task-priority">Priority</label>
                                        <select id="quick-task-priority" className="select" value={taskPriority} onChange={(e) => setTaskPriority(e.target.value)}>
                                            <option value="Medium">Medium</option>
                                            <option value="Urgent">Urgent</option>
                                            <option value="High">High</option>
                                            <option value="Low">Low</option>
                                        </select>
                                    </div>
                                    <div className="field">
                                        <label className="field-label" htmlFor="quick-task-end-date">End date</label>
                                        <input id="quick-task-end-date"
                                            className="input"
                                            type="date"
                                            min={getTodayString()}
                                            value={taskDueDate}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const currentToday = getTodayString();
                                                if (val && val < currentToday) {
                                                    showToast('Error', 'The end date cannot be in the past.', 'error');
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
                                <button type="button" className="btn btn-outline btn-sm" onClick={() => setActiveModal(null)}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmittingTask}>
                                    {isSubmittingTask ? (
                                        <>
                                            <Loader2 className="animate-spin" size={14} aria-hidden="true" />
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        'Create task'
                                    )}
                                </button>
                            </div>
                        </form>
                </Modal>
            )}

            {/* Modal Create Project */}
            {canCreateProject && activeModal === 'createProjectModal' && (
                <Modal title="Create project" description="Set up a new board for your team." size="lg" onClose={closeModal}>
                        <form className="modal-form" onSubmit={handleCreateProject}>
                            <div className="modal-body">
                                <div className="field">
                                    <label className="field-label" htmlFor="new-project-name">Name</label>
                                    <input id="new-project-name"
                                        className="input"
                                        placeholder="e.g. Growth Experiments"
                                        required
                                        autoFocus
                                        value={projectName}
                                        onChange={(e) => setProjectName(e.target.value)}
                                    />
                                </div>
                                <div className="field">
                                    <label className="field-label" htmlFor="new-project-description">Description</label>
                                    <input id="new-project-description"
                                        className="textarea"
                                        placeholder="What is this project about?"
                                        value={projectDesc}
                                        onChange={(e) => setProjectDesc(e.target.value)}
                                    ></input>
                                </div>

                                <div className="grid-2">
                                    <div className="field">
                                        <label className="field-label" htmlFor="new-project-start-date">Start date</label>
                                        <input id="new-project-start-date"
                                            className="input"
                                            type="date"
                                            min={getTodayString()}
                                            value={projectStartDate}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const currentToday = getTodayString();
                                                if (val && val < currentToday) {
                                                    showToast('Error', 'The start date cannot be in the past.', 'error');
                                                    setProjectStartDate(currentToday);
                                                } else {
                                                    setProjectStartDate(val);
                                                }
                                            }}
                                        />
                                    </div>
                                    <div className="field">
                                        <label className="field-label" htmlFor="new-project-end-date">End date</label>
                                        <input id="new-project-end-date"
                                            className="input"
                                            type="date"
                                            min={projectStartDate || getTodayString()}
                                            value={projectDueDate}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                const minAllowed = projectStartDate || getTodayString();
                                                if (val && val < minAllowed) {
                                                    showToast('Error', 'The end date cannot be before the start date or today.', 'error');
                                                    setProjectDueDate(minAllowed);
                                                } else {
                                                    setProjectDueDate(val);
                                                }
                                            }}
                                        />
                                    </div>
                                </div>

                                <div className="grid-2">
                                    <div className="field">
                                        <label className="field-label" htmlFor="new-project-budget">Budget</label>
                                        <input id="new-project-budget"
                                            className="input"
                                            type="number"
                                            min="0"
                                            step="any"
                                            inputMode="decimal"
                                            placeholder="0"
                                            value={projectFinance.budget}
                                            onChange={(e) => setProjectFinance({ ...projectFinance, budget: e.target.value })}
                                        />
                                    </div>
                                    <div className="field">
                                        <label className="field-label" htmlFor="new-project-cost-per-point">Cost per Point</label>
                                        <input id="new-project-cost-per-point"
                                            className="input"
                                            type="number"
                                            min="0"
                                            step="any"
                                            inputMode="decimal"
                                            placeholder="0"
                                            value={projectFinance.costPerPoint}
                                            onChange={(e) => setProjectFinance({ ...projectFinance, costPerPoint: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <p className="field-hint">Optional. Numbers of 0 or more; leave empty to use 0.</p>

                                <div className="field">
                                    <span className="field-label" id="new-project-color">Color</span>
                                    <div className="color-swatches" role="group" aria-labelledby="new-project-color">
                                        {COLOR_OPTIONS.map((color) => (
                                            <button
                                                key={color}
                                                type="button"
                                                aria-label={`Color ${color}`}
                                                aria-pressed={selectedColor === color}
                                                onClick={() => setSelectedColor(color)}
                                                className={`color-swatch${selectedColor === color ? ' is-selected' : ''}`}
                                                style={{ '--swatch': color }}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </div>

                            <div className="modal-footer">
                                <button type="button" className="btn btn-outline btn-sm" onClick={closeModal}>
                                    Cancel
                                </button>
                                <button type="submit" className="btn btn-primary btn-sm" disabled={isSubmittingProject}>
                                    {isSubmittingProject ? (
                                        <>
                                            <Loader2 className="animate-spin" size={14} aria-hidden="true" />
                                            <span>Creating...</span>
                                        </>
                                    ) : (
                                        'Create project'
                                    )}
                                </button>
                            </div>
                        </form>
                </Modal>
            )}
        </>
    );
}