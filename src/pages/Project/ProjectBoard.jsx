import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
// Import socket instance từ file socket.js của bạn
import {socket} from './../../utils/socket.js';
import {
    fetchProjectById,
    fetchTasksByProject,
    fetchColumnsByProject,
    fetchMembersByProject,
    createTask,
    updateTask,
    fetchTaskById,
    deleteTask,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklist,
    fetchTaskComments,
    addComment,
    fetchTaskActivities,
    moveTask
} from './../../../api.jsx';
import { API_BASE_URL } from "../../config/apiConfig.js";
import "./project.css";
import ErrorState from '../../components/common/ErrorState.jsx';
import { useConfirm } from '../../components/common/confirmContext.js';
import { withFallback, failureMessage } from '../../utils/requestState.js';
import {
    Plus,
    Loader2,
    Check
} from "lucide-react";

import ProjectHeader from '../../components/project/ProjectHeader.jsx';
import BoardToolbar from './board/BoardToolbar.jsx';
import BoardColumnHeader from './board/BoardColumnHeader.jsx';
import TaskCard from './board/TaskCard.jsx';
import TaskDrawerFrame from '../../components/task/TaskDrawerFrame.jsx';
import { DrawerSection, ChecklistSection, CommentsSection, ActivitySection, AssigneePicker, UserAvatar } from '../../components/task/TaskDrawerSections.jsx';

// Helper function định dạng ngày theo chuẩn DD/MM/YYYY
const formatDateDMY = (dateValue) => {
    if (!dateValue) return 'Chưa đặt';
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return 'Chưa đặt';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

// Hàm hỗ trợ lấy 2 chữ cái đầu viết hoa
const getInitials = (name) => {
    if (!name) return '??';
    const words = String(name).trim().split(/\s+/);
    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

// Helper trích xuất User ID từ record Member
const extractUserId = (member) => {
    if (!member) return '';
    if (typeof member.userId === 'object') {
        return String(member.userId?._id || member.userId?.id || '');
    }
    if (member.userId) return String(member.userId);
    return String(member._id || member.id || '');
};

const getMemberUserId = (member) => {
    return extractUserId(member);
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

const getMemberEmail = (member) => {
    if (!member) return '';
    if (typeof member === 'object') {
        if (member.userId && typeof member.userId === 'object') {
            return member.userId.email || '';
        }
        return member.email || '';
    }
    return '';
};

const getUserInfo = (userOrId, projectMembers = []) => {
    if (!userOrId) return null;

    if (typeof userOrId === 'object' && (userOrId.username || userOrId.name || userOrId.userId)) {
        return userOrId;
    }

    const targetId = typeof userOrId === 'object' ? String(userOrId._id || userOrId.id) : String(userOrId);

    const found = projectMembers.find(m => {
        const mUserId = getMemberUserId(m);
        const mId = String(m._id || m.id);
        return mUserId === targetId || mId === targetId;
    });

    return found || userOrId;
};

const extractColumnId = (columnId) => {
    if (!columnId) return '';
    if (typeof columnId === 'object') {
        return String(columnId._id || columnId.id || '');
    }
    return String(columnId);
};

// Hàm tính toán Week thực tế và trả về trạng thái On Track / Expiring / Overdue
const calculateTaskWeekAndStatus = (task, project) => {
    let currentWeek = Number(task?.week) || 1;

    const projStart = project?.startDate || project?.createdDate || project?.createdAt;
    const projEnd = project?.date || project?.dueDate || project?.endDate;

    if (!projStart) {
        return { displayWeek: currentWeek, status: 'On Track' };
    }

    const startDate = new Date(projStart);
    startDate.setHours(0, 0, 0, 0);

    const endDate = projEnd ? new Date(projEnd) : null;
    if (endDate) endDate.setHours(0, 0, 0, 0);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (endDate && today > endDate) {
        return { displayWeek: currentWeek, status: 'Overdue' };
    }

    const diffTime = today.getTime() - startDate.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 3600 * 24));

    if (diffDays >= 0) {
        const calculatedWeek = Math.floor(diffDays / 7) + 1;
        currentWeek = Math.max(currentWeek, calculatedWeek);
    }

    const weekStart = new Date(startDate);
    weekStart.setDate(weekStart.getDate() + (currentWeek - 1) * 7);

    let weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    if (endDate && weekEnd > endDate) {
        weekEnd = new Date(endDate);
    }

    const expiringThreshold = new Date(weekEnd);
    expiringThreshold.setDate(expiringThreshold.getDate() - 1);

    if (today >= expiringThreshold && today <= weekEnd) {
        return { displayWeek: currentWeek, status: 'Expiring' };
    }

    return { displayWeek: currentWeek, status: 'On Track' };
};

// ==========================================
// COMPONENT TASK DRAWER (Board) — data + permissions here, presentation in components/task/*
// ==========================================
function TaskDrawer({
                        taskId,
                        isDrawerOpen,
                        handleCloseDrawer,
                        columns = [],
                        projectMembers = [],
                        maxWeeks = 1,
                        onTaskUpdated,
                        onTaskDeleted,
                        isManager = false,
                        isLeader = false,
                        syncEvent = null
                    }) {
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState('');
    const [reloadKey, setReloadKey] = useState(0);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState('');
    const confirm = useConfirm();

    const [comments, setComments] = useState([]);
    const [commentsError, setCommentsError] = useState('');
    const [activities, setActivities] = useState([]);
    const [activitiesError, setActivitiesError] = useState('');
    // fields the user is typing in — a realtime update must not overwrite them
    const dirtyFieldsRef = useRef(new Set());

    const canEditAll = isManager;
    const canEditManagement = isManager || isLeader;
    const canDeleteTask = isManager;
    const canAddChecklist = isManager || isLeader;
    const canDeleteChecklist = isManager || isLeader;

    const normalizeTask = (realTask) => ({
        ...realTask,
        name: realTask.name || realTask.title || '',
        columnId: extractColumnId(realTask.columnId),
        assignees: Array.isArray(realTask.assignees)
            ? realTask.assignees.map(a => typeof a === 'object' ? String(a._id || a.id) : String(a))
            : [],
        points: realTask.points ?? realTask.point ?? 0,
        week: realTask.week ?? 1
    });

    const loadActivities = () => fetchTaskActivities(taskId)
        .then((data) => { setActivities(Array.isArray(data) ? data : (data?.data || [])); setActivitiesError(''); })
        .catch((err) => setActivitiesError(failureMessage({ error: err })));
    const loadComments = () => fetchTaskComments(taskId)
        .then((data) => { setComments(Array.isArray(data) ? data : (data?.data || [])); setCommentsError(''); })
        .catch((err) => setCommentsError(failureMessage({ error: err })));

    useEffect(() => {
        if (!isDrawerOpen || !taskId) return;
        let cancelled = false;
        setLoading(true);
        setLoadError('');
        setSaveError('');
        dirtyFieldsRef.current.clear();
        Promise.all([
            fetchTaskById(taskId),
            fetchTaskComments(taskId).then((d) => ({ ok: d }), (e) => ({ err: failureMessage({ error: e }) })),
            fetchTaskActivities(taskId).then((d) => ({ ok: d }), (e) => ({ err: failureMessage({ error: e }) }))
        ])
            .then(([taskData, c, a]) => {
                if (cancelled) return;
                setTask(normalizeTask(taskData?.data || taskData));
                setComments(c.ok ? (Array.isArray(c.ok) ? c.ok : (c.ok?.data || [])) : []);
                setCommentsError(c.err || '');
                setActivities(a.ok ? (Array.isArray(a.ok) ? a.ok : (a.ok?.data || [])) : []);
                setActivitiesError(a.err || '');
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Lỗi khi tải chi tiết task:", err);
                setTask(null);
                setLoadError(failureMessage({ error: err }));
            })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [taskId, isDrawerOpen, reloadKey]);

    // Realtime: the board forwards socket events for the open task (one set of listeners, owned by the board)
    useEffect(() => {
        if (!syncEvent || !task) return;
        if (syncEvent.type === 'task') {
            const incoming = normalizeTask(syncEvent.data);
            setTask(prev => {
                if (!prev) return prev;
                const next = { ...prev, ...incoming };
                dirtyFieldsRef.current.forEach((field) => { next[field] = prev[field]; });
                return next;
            });
        } else if (syncEvent.type === 'comment') {
            setComments(prev => prev.some(c => String(c._id) === String(syncEvent.data._id)) ? prev : [...prev, syncEvent.data]);
        }
        loadActivities();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [syncEvent]);

    const handleUpdateTaskField = async (updatedFields) => {
        if (!task || isSaving) return;

        if (updatedFields.columnId) {
            updatedFields.columnId = extractColumnId(updatedFields.columnId);
        }

        if (updatedFields.points !== undefined || updatedFields.point !== undefined) {
            const val = Number(updatedFields.points ?? updatedFields.point) || 0;
            updatedFields.points = val;
            updatedFields.point = val;
        }

        if (updatedFields.week !== undefined) {
            updatedFields.week = Number(updatedFields.week) || 1;
        }

        const previousTask = { ...task };
        const updatedTaskLocal = { ...task, ...updatedFields };

        setTask(updatedTaskLocal);
        setSaveError('');
        if (onTaskUpdated) onTaskUpdated(updatedTaskLocal);

        try {
            setIsSaving(true);
            const updatedData = await updateTask(taskId, updatedFields);
            const returnedTask = updatedData?.data || updatedData;
            Object.keys(updatedFields).forEach((f) => dirtyFieldsRef.current.delete(f));

            if (returnedTask) {
                const finalTask = {
                    ...updatedTaskLocal,
                    ...normalizeTask(returnedTask),
                    columnId: extractColumnId(returnedTask.columnId) || updatedTaskLocal.columnId,
                    points: returnedTask.points ?? returnedTask.point ?? updatedTaskLocal.points,
                    week: returnedTask.week ?? updatedTaskLocal.week
                };
                setTask(finalTask);
                if (onTaskUpdated) onTaskUpdated(finalTask);
            }
            loadActivities();
        } catch (error) {
            console.error("Lỗi khi cập nhật task, đang hoàn tác:", error);
            setTask(previousTask);
            setSaveError(`Couldn't save changes — ${error.message}`);
            if (onTaskUpdated) onTaskUpdated(previousTask);
        } finally {
            setIsSaving(false);
        }
    };

    const handleInputChange = (field, value) => {
        const updatedFields = { [field]: value };
        if (field === 'points' || field === 'point') {
            updatedFields.points = value;
            updatedFields.point = value;
        }
        Object.keys(updatedFields).forEach((f) => dirtyFieldsRef.current.add(f));
        setTask(prev => {
            const nextState = { ...prev, ...updatedFields };
            if (onTaskUpdated) onTaskUpdated(nextState);
            return nextState;
        });
    };

    const handleToggleAssignee = (member) => {
        if (!canEditManagement) return;

        const targetUserId = extractUserId(member);
        if (!targetUserId) return;

        const currentAssignees = task.assignees || [];

        const exists = currentAssignees.some(a => {
            const aId = typeof a === 'object' ? (a._id || a.id) : String(a);
            return String(aId) === String(targetUserId);
        });

        let newAssignees;
        if (exists) {
            newAssignees = currentAssignees.filter(a => {
                const aId = typeof a === 'object' ? (a._id || a.id) : String(a);
                return String(aId) !== String(targetUserId);
            });
        } else {
            newAssignees = [...currentAssignees, targetUserId];
        }

        handleUpdateTaskField({ assignees: newAssignees, members: newAssignees });
    };

    const handleDeleteTask = async () => {
        if (!canDeleteTask) return;
        // the dialog stays open (loading) until the request finishes and shows the API error if it fails
        await confirm({
            title: "Xóa task?",
            message: "Bạn có chắc chắn muốn xóa task này?",
            tone: "danger",
            onConfirm: async () => {
                try {
                    await deleteTask(taskId);
                    if (onTaskDeleted) onTaskDeleted(taskId);
                    handleCloseDrawer();
                } catch (error) {
                    console.error("Lỗi khi xóa task:", error);
                    setSaveError(`Couldn't delete the task — ${error.message}`);
                    throw error;
                }
            },
        });
    };

    // Checklist / comment actions return promises: the shared sections show progress and errors
    const handleAddChecklist = async (text) => {
        if (!canAddChecklist || !text.trim()) return;
        const response = await addChecklistItem(taskId, text.trim());
        const realTask = response?.data || response;
        if (realTask && realTask.checklist) {
            setTask(prev => ({ ...prev, checklist: realTask.checklist }));
        }
        loadActivities();
    };

    const handleToggleChecklist = async (item) => {
        const previousChecklist = task.checklist;
        setTask(prev => ({
            ...prev,
            checklist: (prev.checklist || []).map(i => String(i._id) === String(item._id) ? { ...i, completed: !item.completed } : i)
        }));
        try {
            const response = await toggleChecklistItem(taskId, item._id, item.completed);
            const realTask = response?.data || response;
            if (realTask && realTask.checklist) {
                setTask(prev => ({ ...prev, checklist: realTask.checklist }));
            }
            loadActivities();
        } catch (error) {
            console.error("Lỗi khi cập nhật checklist:", error);
            setTask(prev => ({ ...prev, checklist: previousChecklist }));
            throw error;
        }
    };

    const handleDeleteChecklist = async (item) => {
        if (!canDeleteChecklist) return;

        await confirm({
            title: "Xóa checklist?",
            message: "Bạn có chắc chắn muốn xóa checklist này?",
            tone: "danger",
            // same optimistic remove + rollback as before; the dialog shows the API error and stays open
            onConfirm: async () => {
                const previousChecklist = task.checklist;
                setTask(prev => ({ ...prev, checklist: (prev.checklist || []).filter(i => String(i._id) !== String(item._id)) }));

                try {
                    // see the BACKEND MISMATCH note on deleteChecklist in api.jsx — the item id is passed on purpose
                    await deleteChecklist(item._id);
                } catch (error) {
                    console.error("Lỗi khi xóa checklist:", error);
                    setTask(prev => ({ ...prev, checklist: previousChecklist }));
                    throw error;
                }
            },
        });
    };

    const handleAddComment = async (text) => {
        const newComment = await addComment(taskId, text);
        const created = newComment?.data || newComment;
        setComments(prev => prev.some(c => String(c._id) === String(created._id)) ? prev : [...prev, created]);
        loadActivities();
    };

    const column = columns.find(c => String(c._id) === String(task?.columnId));
    const assigneeMembers = projectMembers.filter(m => (task?.assignees || []).includes(extractUserId(m)));

    return (
        <TaskDrawerFrame
            open={isDrawerOpen}
            onClose={handleCloseDrawer}
            labelledBy="task-drawer-title"
            returnFocusSelector={taskId ? `[data-rfd-draggable-id="${taskId}"]` : undefined}
            headerContent={
                <>
                    {task && <span className={`priority-tag priority-${(task.priority || 'Medium').toLowerCase()}`}>{task.priority || 'Medium'}</span>}
                    <span className="drawer-save-state" role="status">
                        {isSaving ? (
                            <><Loader2 className="icon icon-sm animate-spin" aria-hidden="true" /> Saving…</>
                        ) : task?.updatedAt ? `Updated ${formatDateDMY(task.updatedAt)}` : ''}
                    </span>
                </>
            }
        >
            {loading ? (
                <div className="drawer-body drawer-state" role="status">
                    <Loader2 className="icon animate-spin" aria-hidden="true" />
                    <span>Loading task…</span>
                </div>
            ) : loadError || !task ? (
                <div className="drawer-body">
                    <ErrorState
                        title="Couldn't load this task"
                        message={loadError || 'The task could not be loaded.'}
                        onRetry={() => setReloadKey(k => k + 1)}
                    />
                </div>
            ) : (
                <div className="drawer-body">
                    <div className="drawer-title-block">
                        <textarea
                            id="task-drawer-title"
                            className="drawer-title-input"
                            rows="2"
                            aria-label="Task title"
                            value={task.title || ''}
                            readOnly={!canEditManagement}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            onBlur={(e) => canEditManagement && handleUpdateTaskField({ title: e.target.value })}
                            placeholder="Task title"
                        />
                        <div className="drawer-subline">
                            {column && <span className="drawer-chip">{column.title || column.name}</span>}
                            {assigneeMembers.length > 0 && (
                                <span className="avatar-group">
                                    {assigneeMembers.map(m => (
                                        <UserAvatar key={extractUserId(m)} userId={extractUserId(m)} name={getMemberDisplayName(m)} size="xs" />
                                    ))}
                                </span>
                            )}
                        </div>
                    </div>

                    {saveError && <div className="drawer-inline-error" role="alert">{saveError}</div>}

                    <DrawerSection title="Properties">
                        <div className="drawer-field-grid">
                            <label className="drawer-field">
                                <span className="drawer-field-label">Column</span>
                                <select
                                    className="select"
                                    value={extractColumnId(task.columnId)}
                                    disabled={!canEditAll}
                                    onChange={(e) => handleUpdateTaskField({ columnId: e.target.value })}
                                >
                                    {columns.map((col) => (
                                        <option key={col._id} value={String(col._id)}>{col.name || col.title}</option>
                                    ))}
                                </select>
                            </label>
                            <label className="drawer-field">
                                <span className="drawer-field-label">Priority</span>
                                <select
                                    className="select"
                                    value={task.priority || 'Medium'}
                                    disabled={!canEditAll}
                                    onChange={(e) => handleUpdateTaskField({ priority: e.target.value })}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Urgent">Urgent</option>
                                </select>
                            </label>
                            <label className="drawer-field">
                                <span className="drawer-field-label">Points</span>
                                <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    value={task.points ?? task.point ?? 0}
                                    disabled={!canEditAll}
                                    onChange={(e) => handleInputChange('points', e.target.value)}
                                    onBlur={(e) => handleUpdateTaskField({ points: Number(e.target.value) || 0, point: Number(e.target.value) || 0 })}
                                />
                            </label>
                            <label className="drawer-field">
                                <span className="drawer-field-label">Week</span>
                                <select
                                    className="select"
                                    value={task.week || 1}
                                    disabled={!canEditAll}
                                    onChange={(e) => handleUpdateTaskField({ week: Number(e.target.value) })}
                                >
                                    {Array.from({ length: maxWeeks }, (_, i) => i + 1).map(w => (
                                        <option key={w} value={w}>Week {w}</option>
                                    ))}
                                </select>
                            </label>
                            <div className="drawer-field drawer-field--wide">
                                <span className="drawer-field-label">
                                    Assignees{task.assignees?.length > 0 ? ` · ${task.assignees.length}` : ''}
                                </span>
                                <AssigneePicker
                                    members={projectMembers}
                                    selectedIds={task.assignees || []}
                                    canEdit={canEditManagement}
                                    onToggle={handleToggleAssignee}
                                    getUserId={extractUserId}
                                    getName={getMemberDisplayName}
                                    getEmail={getMemberEmail}
                                />
                            </div>
                        </div>
                    </DrawerSection>

                    <DrawerSection title="Description">
                        <textarea
                            className="textarea"
                            rows="4"
                            aria-label="Description"
                            placeholder={canEditAll ? 'Add a more detailed description…' : 'No description.'}
                            value={task.description || ''}
                            readOnly={!canEditAll}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            onBlur={(e) => canEditAll && handleUpdateTaskField({ description: e.target.value })}
                        />
                    </DrawerSection>

                    <ChecklistSection
                        items={task.checklist || []}
                        canToggle
                        canAdd={canAddChecklist}
                        canDelete={canDeleteChecklist}
                        onToggle={handleToggleChecklist}
                        onAdd={handleAddChecklist}
                        onDelete={handleDeleteChecklist}
                    />

                    <CommentsSection
                        comments={comments}
                        loadError={commentsError}
                        onRetry={loadComments}
                        onSubmit={handleAddComment}
                    />

                    <ActivitySection activities={activities} loadError={activitiesError} onRetry={loadActivities} />

                    {canDeleteTask && (
                        <div className="drawer-danger">
                            <button type="button" className="btn btn-outline btn-sm drawer-delete-task" onClick={handleDeleteTask}>
                                Delete task
                            </button>
                        </div>
                    )}
                </div>
            )}
        </TaskDrawerFrame>
    );
}

// ==========================================
// MAIN COMPONENT: PROJECT BOARD
// ==========================================
export default function ProjectBoard({ projectId: propProjectId }) {
    const { id: urlProjectId } = useParams();
    const activeProjectId = urlProjectId || propProjectId;

    const [project, setProject] = useState(null);
    const [projectMembers, setProjectMembers] = useState([]);
    const [memberCurrentRole, setMemberRole] = useState("");
    const [columns, setColumns] = useState([]);
    const [tasks, setTasks] = useState([]);
    const [loading, setLoading] = useState(true);
    // Requests that failed in the last load (empty = everything loaded)
    const [loadFailures, setLoadFailures] = useState([]);

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedWeek, setSelectedWeek] = useState('all');

    const [activeModal, setActiveModal] = useState(null);
    const [isColumnFixed, setIsColumnFixed] = useState(false);

    const [selectedTaskId, setSelectedTaskId] = useState(null);
    // socket events for the task open in the drawer (forwarded so the drawer needs no listeners of its own)
    const [drawerSync, setDrawerSync] = useState(null);
    const selectedTaskIdRef = useRef(null);
    useEffect(() => { selectedTaskIdRef.current = selectedTaskId; }, [selectedTaskId]);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskName, setNewTaskName] = useState('');
    const [newTaskColumnId, setNewTaskColumnId] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('Medium');
    const [newTaskPoints, setNewTaskPoints] = useState(0);
    const [newTaskWeek, setNewTaskWeek] = useState(1);
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

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

            const res = await fetch(`${API_BASE_URL}/user/currentUser`, {
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
            const uId = extractUserId(m);
            return uId === String(currentUserId);
        }) || null;
    }, [currentUserId, projectMembers]);

    const currentUserRole = currentProjectMember?.role || currentUser?.role || memberCurrentRole;

    const isAdmin = String(currentUser?.role).toLowerCase() === 'admin';
    const isLeader = currentUserRole === 'Leader';
    const isManager = currentUserRole === 'Manager' || isAdmin;

    const canCreateTask = isManager || isLeader;

    const fetchBoardData = async () => {
        if (!activeProjectId) return;
        const failures = [];

        try {
            setLoading(true);

            const [projectData, columnsData, tasksData, membersData] = await Promise.all([
                withFallback(fetchProjectById(activeProjectId), null, failures, 'project'),
                withFallback(fetchColumnsByProject(activeProjectId), [], failures, 'columns'),
                withFallback(fetchTasksByProject(activeProjectId), [], failures, 'tasks'),
                withFallback(fetchMembersByProject(activeProjectId), [], failures, 'members')
            ]);

            const realProject = projectData?.data || projectData || {};
            const realColumns = Array.isArray(columnsData) ? columnsData : (columnsData?.data || []);
            const realTasks = Array.isArray(tasksData) ? tasksData : (tasksData?.data || []);
            const realMembers = Array.isArray(membersData)
                ? membersData
                : (membersData?.data || membersData?.members || []);

            realColumns.sort((a, b) => (a.position || 0) - (b.position || 0));

            setProject(realProject);
            setColumns(realColumns);
            setTasks(realTasks);
            setProjectMembers(realMembers);
        } catch (error) {
            console.error("Lỗi khi tải dữ liệu từ API:", error);
            failures.push({ label: 'board', error });
        } finally {
            setLoadFailures(failures);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBoardData();
    }, [activeProjectId]);

    // ==========================================
    // TÍCH HỢP SOCKET.IO (DÙNG SOCKET.JS)
    // ==========================================
    useEffect(() => {
        if (!activeProjectId) return;

        // Tham gia room của project
        socket.emit('join_project', activeProjectId);

        // Sự kiện 1: Khi có Task mới
        const handleTaskCreated = (newTask) => {
            if (!newTask) return;
            const taskData = newTask.data || newTask;
            const taskId = String(taskData._id || taskData.id);

            setTasks(prevTasks => {
                const exists = prevTasks.some(t => String(t._id || t.id) === taskId);
                if (exists) return prevTasks;

                const formattedTask = {
                    ...taskData,
                    _id: taskId,
                    columnId: extractColumnId(taskData.columnId),
                    points: taskData.points ?? taskData.point ?? 0,
                    week: taskData.week ?? 1
                };
                return [...prevTasks, formattedTask];
            });
        };

        // Sự kiện 2: Khi có Task được cập nhật
        const handleTaskUpdated = (updatedTask) => {
            if (!updatedTask) return;
            const taskData = updatedTask.data || updatedTask;
            const taskId = String(taskData._id || taskData.id);

            setTasks(prevTasks =>
                prevTasks.map(t => {
                    if (String(t._id || t.id) === taskId) {
                        return {
                            ...t,
                            ...taskData,
                            _id: taskId,
                            columnId: extractColumnId(taskData.columnId || t.columnId),
                            points: taskData.points ?? taskData.point ?? t.points,
                            week: taskData.week ?? t.week
                        };
                    }
                    return t;
                })
            );
            if (String(selectedTaskIdRef.current) === taskId) setDrawerSync({ type: 'task', data: taskData, at: Date.now() });
        };

        // Sự kiện 3: Khi Kéo Thả / Di chuyển Task
        const handleTaskMoved = (data) => {
            if (!data) return;
            const taskId = String(data.taskId || data._id || data.id);
            const targetColumnId = extractColumnId(data.destColumnId || data.columnId);

            if (!taskId || !targetColumnId) return;

            setTasks(prevTasks =>
                prevTasks.map(t => {
                    if (String(t._id || t.id) === taskId) {
                        return {
                            ...t,
                            columnId: targetColumnId
                        };
                    }
                    return t;
                })
            );
            if (String(selectedTaskIdRef.current) === taskId) setDrawerSync({ type: 'task', data: { _id: taskId, columnId: targetColumnId }, at: Date.now() });
        };

        // Sự kiện 5: Comment mới (chỉ drawer của task đang mở cần)
        const handleCommentAdded = (comment) => {
            if (!comment || String(comment.taskId) !== String(selectedTaskIdRef.current)) return;
            setDrawerSync({ type: 'comment', data: comment, at: Date.now() });
        };

        // Sự kiện 4: Khi Task bị xóa
        const handleTaskDeleted = (deletedData) => {
            if (!deletedData) return;
            const deletedId = String(deletedData.taskId || deletedData._id || deletedData.id || deletedData);

            setTasks(prevTasks => prevTasks.filter(t => String(t._id || t.id) !== deletedId));
        };

        // Đăng ký listener từ socket instance
        socket.on('task_created', handleTaskCreated);
        socket.on('task_updated', handleTaskUpdated);
        socket.on('task_moved', handleTaskMoved);
        socket.on('task_deleted', handleTaskDeleted);
        socket.on('comment_added', handleCommentAdded);

        // Hủy đăng ký listener và rời room khi unmount
        return () => {
            socket.emit('leave_project', activeProjectId);
            socket.off('task_created', handleTaskCreated);
            socket.off('task_updated', handleTaskUpdated);
            socket.off('task_moved', handleTaskMoved);
            socket.off('task_deleted', handleTaskDeleted);
            socket.off('comment_added', handleCommentAdded);
        };
    }, [activeProjectId]);

    const totalProjectWeeks = useMemo(() => {
        if (!project) return 1;

        const start = project.startDate || project.createdDate || project.createdAt;
        const end = project.date || project.dueDate || project.endDate;

        if (!start || !end) return 1;

        const startDateObj = new Date(start);
        const endDateObj = new Date(end);

        const diffTime = endDateObj.getTime() - startDateObj.getTime();
        const diffDays = Math.floor(diffTime / (1000 * 3600 * 24)) + 1;

        if (diffDays <= 0) return 1;

        return Math.ceil(diffDays / 7);
    }, [project]);

    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => {
            const query = searchQuery.toLowerCase().trim();
            const title = (task.title || task.name || '').toLowerCase();
            const matchesQuery = !query || title.includes(query);

            const { displayWeek } = calculateTaskWeekAndStatus(task, project);
            const matchesWeek = selectedWeek === 'all' || displayWeek === Number(selectedWeek);

            return matchesQuery && matchesWeek;
        });
    }, [tasks, searchQuery, selectedWeek, project]);

    const getSortedTasksForColumn = (column) => {
        const columnTaskMap = new Map();

        filteredTasks.forEach(task => {
            if (!task || !task.columnId) return;
            const taskColId = extractColumnId(task.columnId);
            if (String(taskColId) === String(column._id)) {
                columnTaskMap.set(String(task._id || task.id), task);
            }
        });

        if (Array.isArray(column.taskOrderIds) && column.taskOrderIds.length > 0) {
            const sorted = [];
            column.taskOrderIds.forEach(id => {
                const idStr = typeof id === 'object' ? id._id || id.toString() : String(id);
                if (columnTaskMap.has(idStr)) {
                    sorted.push(columnTaskMap.get(idStr));
                    columnTaskMap.delete(idStr);
                }
            });
            return [...sorted, ...Array.from(columnTaskMap.values())];
        }

        return Array.from(columnTaskMap.values());
    };

    const resetTaskForm = () => {
        setNewTaskTitle('');
        setNewTaskName('');
        setNewTaskDesc('');
        setNewTaskPriority('Medium');
        setNewTaskPoints(0);
        setNewTaskWeek(1);
    };

    const closeModal = () => {
        setActiveModal(null);
        resetTaskForm();
    };

    const handleOpenTaskDrawer = (taskId) => {
        setSelectedTaskId(taskId);
        setIsDrawerOpen(true);
    };

    const handleCloseTaskDrawer = () => {
        setIsDrawerOpen(false);
        setSelectedTaskId(null);
    };

    const handleTaskUpdatedFromDrawer = (updatedTask) => {
        setTasks(prevTasks =>
            prevTasks.map(t => String(t._id || t.id) === String(updatedTask._id || updatedTask.id)
                ? { ...t, ...updatedTask, columnId: extractColumnId(updatedTask.columnId) }
                : t
            )
        );
    };

    const handleTaskDeletedFromDrawer = (deletedTaskId) => {
        setTasks(prevTasks => prevTasks.filter(t => String(t._id || t.id) !== String(deletedTaskId)));
    };

    const handleOnDragEnd = async (result) => {
        const { destination, source, draggableId } = result;
        if (!destination) return;
        if (
            destination.droppableId === source.droppableId &&
            destination.index === source.index
        ) {
            return;
        }

        const targetColumn = columns.find(c => String(c._id) === String(destination.droppableId));
        const targetColumnName = (targetColumn?.name || targetColumn?.title || '').toLowerCase();
        const isMovingToDone = targetColumnName.includes('done');

        const previousTasks = [...tasks];

        setTasks((prevTasks) => {
            const newTasks = Array.from(prevTasks);
            const movedTaskIndex = newTasks.findIndex(t => String(t._id || t.id) === String(draggableId));

            if (movedTaskIndex !== -1) {
                newTasks[movedTaskIndex] = {
                    ...newTasks[movedTaskIndex],
                    columnId: destination.droppableId
                };
            }
            return newTasks;
        });

        const payload = {
            sourceColumnId: source.droppableId === 'backlog' ? null : source.droppableId,
            destColumnId: destination.droppableId,
            destinationIndex: destination.index,
            action: isMovingToDone ? 'accept' : undefined
        };

        try {
            await moveTask(draggableId, payload);
        } catch (error) {
            console.error("Lỗi kéo thả task, hoàn tác UI:", error);
            setTasks(previousTasks);
        }
    };

    const handleLeaderDecisionOnTask = async (e, task, currentColumnId, isAccepted) => {
        e.stopPropagation();

        const targetColumn = columns.find(c => {
            const name = (c.name || c.title || '').toLowerCase();
            return isAccepted ? name.includes('done') : (name.includes('review') || name.includes('in review'));
        }) || columns[0];

        const destColumnId = targetColumn ? targetColumn._id : currentColumnId;
        const previousTasks = [...tasks];

        setTasks((prevTasks) =>
            prevTasks.map(t =>
                String(t._id || t.id) === String(task._id || task.id)
                    ? { ...t, columnId: extractColumnId(destColumnId) }
                    : t
            )
        );

        try {
            await moveTask(task._id || task.id, {
                sourceColumnId: currentColumnId,
                destColumnId: destColumnId,
                destinationIndex: 0,
                action: isAccepted ? 'accept' : 'not_accept'
            });
        } catch (error) {
            console.error("Lỗi cập nhật trạng thái duyệt task:", error);
            setTasks(previousTasks);
        }
    };

    const handleOpenCreateModal = (columnId = '', isFixed = false) => {
        if (!canCreateTask) return;
        setNewTaskColumnId(columnId || (columns[0]?._id || ''));
        setIsColumnFixed(isFixed);
        resetTaskForm();
        setActiveModal('quickCreateTaskModal');
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!canCreateTask || !newTaskTitle.trim() || !newTaskColumnId) {
            return;
        }

        try {
            setIsSubmitting(true);
            const pointValue = Number(newTaskPoints) || 0;
            const weekValue = Number(newTaskWeek) || 1;

            const payload = {
                title: newTaskTitle,
                name: newTaskName || newTaskTitle,
                description: newTaskDesc,
                columnId: newTaskColumnId,
                projectId: activeProjectId,
                priority: newTaskPriority,
                point: pointValue,
                points: pointValue,
                week: weekValue,
                assignees: [],
                members: []
            };

            const response = await createTask(payload);
            const createdTask = response?.data || response;

            const formattedNewTask = {
                ...createdTask,
                _id: String(createdTask._id || createdTask.id),
                title: createdTask.title || newTaskTitle,
                columnId: extractColumnId(createdTask.columnId || newTaskColumnId),
                priority: createdTask.priority || newTaskPriority,
                points: createdTask.points ?? createdTask.point ?? pointValue,
                point: createdTask.point ?? createdTask.points ?? pointValue,
                week: createdTask.week ?? weekValue,
                assignees: createdTask.assignees || [],
                startDate: createdTask.startDate || new Date().toISOString()
            };

            setTasks(prevTasks => {
                const exists = prevTasks.some(t => String(t._id || t.id) === String(formattedNewTask._id));
                if (exists) return prevTasks;
                return [...prevTasks, formattedNewTask];
            });

            closeModal();
        } catch (error) {
            console.error("Lỗi khi tạo task mới:", error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) {
        return (
            <div className="page-loading" role="status">
                <Loader2 className="icon animate-spin" aria-hidden="true" />
                <span>Loading...</span>
            </div>
        );
    }

    // Board cannot be shown without the project, its columns and its tasks — show the error, not an empty board
    const coreFailure = loadFailures.find((f) => f.label !== 'members');
    const membersFailed = loadFailures.some((f) => f.label === 'members');
    if (coreFailure) {
        return (
            <main className="page-content">
                <ErrorState
                    title="Couldn't load this project board"
                    message={failureMessage(coreFailure)}
                    onRetry={fetchBoardData}
                />
            </main>
        );
    }

    const formattedStartDate = formatDateDMY(project?.startDate || project?.createdDate || project?.createdAt);
    const formattedDueDate = formatDateDMY(project?.date || project?.dueDate || project?.endDate);

    return (
        <>

                <ProjectHeader
                    projectId={activeProjectId}
                    project={project}
                    memberCount={projectMembers.length}
                    taskCount={tasks.length}
                    startDate={formattedStartDate}
                    endDate={formattedDueDate}
                />

                <main className="page-content page-content--board">
                    {membersFailed && (
                        <ErrorState
                            variant="inline"
                            title="Project members could not be loaded."
                            message="Assignee names may be missing."
                            onRetry={fetchBoardData}
                        />
                    )}
                    <BoardToolbar
                        searchQuery={searchQuery}
                        onSearchChange={setSearchQuery}
                        selectedWeek={selectedWeek}
                        onWeekChange={setSelectedWeek}
                        totalWeeks={totalProjectWeeks}
                        canCreateTask={canCreateTask}
                        onCreateTask={() => handleOpenCreateModal('', false)}
                    />

                    <DragDropContext onDragEnd={handleOnDragEnd}>
                        <div className="board scroll-x" id="kanbanBoard">
                            {columns.map((column) => {
                                const columnTasks = getSortedTasksForColumn(column);
                                const isDoneColumn = (column.name || column.title || '').toLowerCase().includes('done');

                                return (
                                    <div className="board-column" key={column._id}>
                                        <BoardColumnHeader
                                            title={column.name || column.title}
                                            count={columnTasks.length}
                                            canCreateTask={canCreateTask}
                                            onAddTask={() => handleOpenCreateModal(column._id, true)}
                                        />

                                        <Droppable droppableId={String(column._id)}>
                                            {(provided, snapshot) => (
                                                <div
                                                    className={`board-column-body${snapshot.isDraggingOver ? ' is-drop-target' : ''}`}
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                >
                                                    {columnTasks.length === 0 ? (
                                                        // hidden while a card hovers this column so the drop placeholder isn't pushed down
                                                        !snapshot.isDraggingOver && (
                                                            <p className="board-column-empty">
                                                                {searchQuery.trim() || selectedWeek !== 'all' ? 'No tasks match the filters' : 'No tasks yet'}
                                                            </p>
                                                        )
                                                    ) : (
                                                        columnTasks.map((task, index) => {
                                                            const assignees = Array.isArray(task.assignees) ? task.assignees : [];
                                                            const taskPoints = task.points ?? task.point ?? 0;
                                                            const showNotAcceptBtn = (isDoneColumn && isLeader) || (isDoneColumn && isManager);

                                                            const isTaskAssignee = assignees.some(a => {
                                                                const assigneeId = typeof a === 'object' ? String(a._id || a.id) : String(a);
                                                                return currentUserId && assigneeId === String(currentUserId);
                                                            });
                                                            const canDragThisTask = isManager || isLeader || isTaskAssignee;

                                                            const { displayWeek, status } = calculateTaskWeekAndStatus(task, project);
                                                            const assigneeList = assignees.map((assignee, aIdx) => {
                                                                const name = getMemberDisplayName(getUserInfo(assignee, projectMembers));
                                                                const id = typeof assignee === 'object' ? (assignee._id || assignee.id || aIdx) : assignee;
                                                                return { id: String(id), name, initials: getInitials(name) };
                                                            });

                                                            return (
                                                                <Draggable
                                                                    key={String(task._id || task.id)}
                                                                    draggableId={String(task._id || task.id)}
                                                                    index={index}
                                                                    isDragDisabled={!canDragThisTask}
                                                                >
                                                                    {(provided, snapshot) => (
                                                                        <TaskCard
                                                                            task={task}
                                                                            dragRef={provided.innerRef}
                                                                            draggableProps={provided.draggableProps}
                                                                            dragHandleProps={provided.dragHandleProps}
                                                                            isDragging={snapshot.isDragging}
                                                                            canDrag={canDragThisTask}
                                                                            week={displayWeek}
                                                                            points={taskPoints}
                                                                            deadlineStatus={status}
                                                                            assignees={assigneeList}
                                                                            onOpen={() => handleOpenTaskDrawer(task._id || task.id)}
                                                                            onNotAccept={showNotAcceptBtn ? (e) => handleLeaderDecisionOnTask(e, task, column._id, false) : undefined}
                                                                        />
                                                                    )}
                                                                </Draggable>
                                                            );
                                                        })
                                                    )}
                                                    {provided.placeholder}
                                                </div>
                                            )}
                                        </Droppable>

                                        {canCreateTask && (
                                            <button
                                                type="button"
                                                className="add-task-btn"
                                                onClick={() => handleOpenCreateModal(column._id, true)}
                                            >
                                                <Plus className="icon icon-sm" aria-hidden="true" />
                                                Add task
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </DragDropContext>
                </main>

            <TaskDrawer
                taskId={selectedTaskId}
                isDrawerOpen={isDrawerOpen}
                handleCloseDrawer={handleCloseTaskDrawer}
                columns={columns}
                projectMembers={projectMembers}
                maxWeeks={totalProjectWeeks}
                onTaskUpdated={handleTaskUpdatedFromDrawer}
                onTaskDeleted={handleTaskDeletedFromDrawer}
                isManager={isManager}
                isLeader={isLeader}
                syncEvent={drawerSync}
            />

            {canCreateTask && activeModal === 'quickCreateTaskModal' && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div
                        className="modal-box"
                        onClick={(e) => e.stopPropagation()}
                        style={{
                            maxHeight: '90vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflowY: 'auto',
                            padding: '24px',
                            boxSizing: 'border-box',
                            width: '100%',
                            maxWidth: '520px'
                        }}
                    >
                        <form
                            onSubmit={handleCreateTask}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                flex: 1,
                                overflow: 'hidden'
                            }}
                        >
                            <div className="modal-header" style={{ flexShrink: 0 }}>
                                <h2>Add Task</h2>
                                <button type="button" className="btn-icon" onClick={closeModal} style={{ cursor: 'pointer' }}>✕</button>
                            </div>

                            <div
                                className="modal-body"
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: '16px',
                                    overflowY: 'auto',
                                    paddingRight: '4px',
                                    flex: 1
                                }}
                            >
                                <div className="form-group">
                                    <label className="form-label">Title *</label>
                                    <input
                                        className="input"
                                        placeholder="e.g: My task title"
                                        value={newTaskTitle}
                                        onChange={(e) => setNewTaskTitle(e.target.value)}
                                        required
                                    />
                                </div>
                                <div className="form-group">
                                    <label className="form-label">Column *</label>
                                    <select
                                        className="select"
                                        value={newTaskColumnId}
                                        onChange={(e) => setNewTaskColumnId(e.target.value)}
                                        disabled={isColumnFixed}
                                        style={{
                                            backgroundColor: isColumnFixed ? '#f1f5f9' : '#ffffff',
                                            cursor: isColumnFixed ? 'not-allowed' : 'pointer',
                                            opacity: isColumnFixed ? 0.8 : 1
                                        }}
                                        required
                                    >
                                        {columns.map((col) => (
                                            <option key={col._id} value={col._id}>{col.name || col.title}</option>
                                        ))}
                                    </select>
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
                                        style={{ cursor: 'pointer' }}
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
                                        value={newTaskDesc}
                                        onChange={(e) => setNewTaskDesc(e.target.value)}
                                    />
                                </div>
                            </div>

                            <div className="modal-footer" style={{ flexShrink: 0, marginTop: '16px' }}>
                                <button type="button" className="btn btn-secondary" onClick={closeModal} style={{ cursor: 'pointer' }}>Cancel</button>
                                <button type="submit" className="btn btn-primary" disabled={isSubmitting} style={{ cursor: isSubmitting ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    {isSubmitting ? (
                                        <>
                                            <Loader2 className="animate-spin" size={16} />
                                            <span>Adding...</span>
                                        </>
                                    ) : (
                                        'Add'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    );
}