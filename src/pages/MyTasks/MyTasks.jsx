import React, { useEffect, useState, useMemo, useCallback } from "react";
import {
    fetchTaskById,
    updateTask,
    deleteTask,
    addChecklistItem,
    toggleChecklistItem,
    deleteChecklist,
    fetchTaskComments,
    addComment,
    fetchTaskActivities,
    fetchColumnsByProject,
    fetchMembersByProject,
    fetchProjectById,
    fetchMyTasks,
    moveTask
} from "./../../../api.jsx";
import { applyMoveToColumns, buildMovePayload, getDestinationIndex, mergeMovedTask, isTaskCompleted } from '../../utils/taskMove.js';
import { CheckSquare, ClipboardList, Loader2, Search } from "lucide-react";
import { useConfirm, deleteConfirm } from "../../components/common/confirmContext.js";
import ErrorState from "../../components/common/ErrorState.jsx";
import { failureMessage } from "../../utils/requestState.js";
import TaskDrawerFrame from "../../components/task/TaskDrawerFrame.jsx";
import { DrawerSection, ChecklistSection, CommentsSection, ActivitySection, AssigneePicker, UserAvatar } from "../../components/task/TaskDrawerSections.jsx";
import MyTaskInsights from "./Insights/MyTaskInsights.jsx";

// --- HELPER FUNCTIONS ---
const calculateDueDateByWeek = (startDateStr, weekNum = 1) => {
    if (!startDateStr) return null;
    const baseDate = new Date(startDateStr);
    if (isNaN(baseDate.getTime())) return null;

    const currentWeek = Math.max(1, Number(weekNum) || 1);
    const daysToAdd = (currentWeek * 7) - 1;

    const dueDate = new Date(baseDate);
    dueDate.setDate(dueDate.getDate() + daysToAdd);
    return dueDate;
};

// Tính số ngày còn lại theo startDate của Project và week của Task
const getRemainingDaysLabel = (startDateStr, weekNum = 1) => {
    if (!startDateStr) return "Not set";
    const startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime())) return "Not set";

    const currentWeek = Math.max(1, Number(weekNum) || 1);
    const daysToAdd = (currentWeek * 7) - 1;

    const dueDate = new Date(startDate);
    dueDate.setDate(dueDate.getDate() + daysToAdd);

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    dueDate.setHours(0, 0, 0, 0);

    const diffTime = dueDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
        return `${Math.abs(diffDays)} days overdue`;
    } else if (diffDays === 0) {
        return "Due today";
    } else {
        return `${diffDays + 1} days left`;
    }
};

const getInitials = (name) => {
    if (!name) return "ME";
    const words = String(name).trim().split(/\s+/);
    if (words.length === 1) {
        return words[0].substring(0, 2).toUpperCase();
    }
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

const extractColumnId = (columnId) => {
    if (!columnId) return '';
    if (typeof columnId === 'object') {
        return String(columnId._id || columnId.id || '');
    }
    return String(columnId);
};

const extractUserId = (member) => {
    if (!member) return '';
    if (typeof member.userId === 'object') {
        return String(member.userId?._id || member.userId?.id || '');
    }
    if (member.userId) return String(member.userId);
    return String(member._id || member.id || '');
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

const getCurrentUserId = () => {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "{}");
        return String(user._id || user.id || "");
    } catch {
        return "";
    }
};

// --- COMPONENT TASK DRAWER (My Tasks) — data + permissions here, presentation in components/task/* ---
function TaskDrawer({
                        taskId,
                        isDrawerOpen,
                        handleCloseDrawer,
                        onTaskUpdated,
                        onTaskDeleted,
                    }) {
    const [task, setTask] = useState(null);
    const [projectStartDate, setProjectStartDate] = useState(null);
    const [columns, setColumns] = useState([]);
    const [projectMembers, setProjectMembers] = useState([]);
    const [currentUserRole, setCurrentUserRole] = useState("Member");
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

    const currentUserId = getCurrentUserId();

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

        fetchTaskById(taskId)
            .then(async (taskData) => {
                const realTask = taskData?.data || taskData;
                const formattedAssignees = Array.isArray(realTask.assignees)
                    ? realTask.assignees.map(a => typeof a === 'object' ? String(a._id || a.id) : String(a))
                    : [];

                const projId = typeof realTask.projectId === 'object'
                    ? (realTask.projectId?._id || realTask.projectId?.id)
                    : realTask.projectId;

                let pStartDate = typeof realTask.projectId === 'object' ? realTask.projectId?.startDate : null;

                if (projId && !pStartDate) {
                    try {
                        const pData = await fetchProjectById(projId);
                        const realProj = pData?.data || pData;
                        pStartDate = realProj?.startDate;
                    } catch (e) {
                        console.error("Không thể lấy startDate của Project:", e);
                    }
                }
                if (cancelled) return;

                setProjectStartDate(pStartDate);
                const calculatedDue = calculateDueDateByWeek(pStartDate, realTask.week ?? 1);

                setTask({
                    ...realTask,
                    title: realTask.title || realTask.name || '',
                    columnId: extractColumnId(realTask.columnId),
                    columnTitle: typeof realTask.columnId === 'object' ? (realTask.columnId?.title || realTask.columnId?.name) : '',
                    assignees: formattedAssignees,
                    points: realTask.points ?? realTask.point ?? 0,
                    week: realTask.week ?? 1,
                    dueDate: realTask.dueDate || calculatedDue,
                });

                if (projId && typeof projId === 'string') {
                    const [colsData, memsData] = await Promise.all([
                        fetchColumnsByProject(projId).catch(() => []),
                        fetchMembersByProject(projId).catch(() => [])
                    ]);
                    if (cancelled) return;

                    const realCols = Array.isArray(colsData) ? colsData : (colsData?.data || []);
                    realCols.sort((a, b) => (a.position || 0) - (b.position || 0));
                    setColumns(realCols);

                    const realMems = Array.isArray(memsData) ? memsData : (memsData?.data || memsData?.members || []);
                    setProjectMembers(realMems);

                    const currentMember = realMems.find(m => {
                        const uId = extractUserId(m);
                        return String(uId) === String(currentUserId);
                    });
                    if (currentMember) {
                        setCurrentUserRole(currentMember.role || "Member");
                    }
                }

                const [c, a] = await Promise.all([
                    fetchTaskComments(taskId).then((d) => ({ ok: d }), (e) => ({ err: failureMessage({ error: e }) })),
                    fetchTaskActivities(taskId).then((d) => ({ ok: d }), (e) => ({ err: failureMessage({ error: e }) }))
                ]);
                if (cancelled) return;
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
    }, [taskId, isDrawerOpen, currentUserId, reloadKey]);

    const isOwnerOrManager = ["Owner", "Manager", "Admin", "Leader"].includes(currentUserRole);
    const isAssignee = task?.assignees?.some(a => {
        const id = typeof a === 'object' ? String(a._id || a.id) : String(a);
        return id === String(currentUserId);
    });

    const canEditAll = isOwnerOrManager;
    const canEditStatus = isOwnerOrManager || isAssignee;
    const canManageChecklist = isOwnerOrManager;
    const canDelete = isOwnerOrManager;

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
            const newWeek = Number(updatedFields.week) || 1;
            const newDue = calculateDueDateByWeek(projectStartDate, newWeek);
            if (newDue) {
                updatedFields.dueDate = newDue;
            }
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

            if (returnedTask) {
                const finalTask = {
                    ...updatedTaskLocal,
                    ...returnedTask,
                    columnId: extractColumnId(returnedTask.columnId) || updatedTaskLocal.columnId,
                    assignees: Array.isArray(returnedTask.assignees)
                        ? returnedTask.assignees.map(a => typeof a === 'object' ? String(a._id || a.id) : String(a))
                        : updatedTaskLocal.assignees,
                    points: returnedTask.points ?? returnedTask.point ?? updatedTaskLocal.points,
                };
                setTask(finalTask);
                if (onTaskUpdated) onTaskUpdated(finalTask);
            }
            loadActivities();
        } catch (error) {
            console.error("Lỗi khi cập nhật task:", error);
            setTask(previousTask);
            setSaveError(`Couldn't save changes — ${error.message}`);
            if (onTaskUpdated) onTaskUpdated(previousTask);
        } finally {
            setIsSaving(false);
        }
    };

    // Changing the column is a move (PUT /task/:id/move): only that endpoint sets status / completedAt /
    // completedDate and the column order. The task goes to the end of the destination column.
    const handleColumnChange = async (destColumnId) => {
        if (!task || isSaving) return;
        const sourceColumnId = extractColumnId(task.columnId);
        if (!destColumnId || destColumnId === sourceColumnId) return;
        const destColumn = columns.find(c => String(c._id) === String(destColumnId));
        const payload = buildMovePayload(sourceColumnId, destColumnId, getDestinationIndex(destColumn, taskId));
        const previousTask = task;
        const previousColumns = columns;
        const columnTitle = destColumn ? (destColumn.title || destColumn.name) : '';

        setSaveError('');
        setIsSaving(true);
        setTask(prev => ({ ...prev, columnId: payload.destColumnId, columnTitle }));
        setColumns(prev => applyMoveToColumns(prev, taskId, payload.sourceColumnId, payload.destColumnId, payload.destinationIndex));
        try {
            const response = await moveTask(taskId, payload);
            const moved = { ...mergeMovedTask(previousTask, response?.task, payload.destColumnId), columnTitle };
            setTask(moved);
            if (onTaskUpdated) onTaskUpdated(moved);
            loadActivities();
        } catch (error) {
            console.error("Moving the task failed, reverting:", error);
            setTask(previousTask);
            setColumns(previousColumns);
            setSaveError(`Couldn't move the task — ${error.message}`);
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
        setTask(prev => ({ ...prev, ...updatedFields }));
    };

    const handleToggleAssignee = (member) => {
        if (!canEditAll) return;
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
        if (!canDelete) return;
        // the dialog stays open (loading) until the request finishes and shows the API error if it fails
        await confirm(deleteConfirm({
            item: "task",
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
        }));
    };

    // Checklist / comment actions return promises: the shared sections show progress and errors
    const handleAddChecklist = async (text) => {
        if (!canManageChecklist || !text.trim()) return;
        const response = await addChecklistItem(taskId, text.trim());
        const realTask = response?.data || response;
        if (realTask && realTask.checklist) {
            setTask(prev => ({ ...prev, checklist: realTask.checklist }));
            if (onTaskUpdated) onTaskUpdated({ ...task, checklist: realTask.checklist });
        }
        loadActivities();
    };

    const handleToggleChecklist = async (item) => {
        if (!canEditStatus) return;
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
                if (onTaskUpdated) onTaskUpdated({ ...task, checklist: realTask.checklist });
            }
            loadActivities();
        } catch (error) {
            console.error("Lỗi khi cập nhật checklist:", error);
            setTask(prev => ({ ...prev, checklist: previousChecklist }));
            throw error;
        }
    };

    const handleDeleteChecklist = async (item) => {
        if (!canManageChecklist) return;

        await confirm(deleteConfirm({
            item: "checklist",
            name: item.text,
            onConfirm: async () => {
                const previousChecklist = task.checklist;
                setTask(prev => ({ ...prev, checklist: (prev.checklist || []).filter(i => String(i._id) !== String(item._id)) }));

                try {
                    // see the BACKEND MISMATCH note on deleteChecklist in api.jsx — the item id is passed on purpose
                    await deleteChecklist(item._id);
                } catch (error) {
                    console.error("Deleting the checklist item failed:", error);
                    setTask(prev => ({ ...prev, checklist: previousChecklist }));
                    throw error;
                }
            },
        }));
    };

    const handleAddComment = async (text) => {
        const newComment = await addComment(taskId, text);
        const created = newComment?.data || newComment;
        setComments(prev => prev.some(c => String(c._id) === String(created._id)) ? prev : [...prev, created]);
        loadActivities();
    };

    const column = columns.find(c => String(c._id) === String(task?.columnId));
    const columnLabel = column ? (column.title || column.name) : task?.columnTitle;
    const assigneeMembers = projectMembers.filter(m => (task?.assignees || []).includes(extractUserId(m)));

    return (
        <TaskDrawerFrame
            open={isDrawerOpen}
            onClose={handleCloseDrawer}
            labelledBy="task-drawer-title"
            headerContent={
                <>
                    {task && <span className={`priority-tag priority-${(task.priority || 'Medium').toLowerCase()}`}>{task.priority || 'Medium'}</span>}
                    <span className="drawer-save-state" role="status">
                        {isSaving ? (
                            <><Loader2 className="icon icon-sm animate-spin" aria-hidden="true" /> Saving…</>
                        ) : task ? `Your role: ${currentUserRole}` : ''}
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
                            disabled={!canEditAll}
                            value={task.title || ''}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            onBlur={(e) => canEditAll && handleUpdateTaskField({ title: e.target.value })}
                            placeholder="Task title"
                        />
                        <div className="drawer-subline">
                            {columnLabel && <span className="drawer-chip">{columnLabel}</span>}
                            {task.dueDate && <span className="drawer-chip">Due {formatShortDate(task.dueDate)} · {getRemainingDaysLabel(projectStartDate, task.week)}</span>}
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
                                    disabled={!canEditStatus || isSaving}
                                    value={extractColumnId(task.columnId)}
                                    onChange={(e) => handleColumnChange(e.target.value)}
                                >
                                    {columns.length > 0 ? (
                                        columns.map((col) => (
                                            <option key={col._id} value={String(col._id)}>{col.name || col.title}</option>
                                        ))
                                    ) : (
                                        <option value={extractColumnId(task.columnId)}>{columnLabel || 'Backlog'}</option>
                                    )}
                                </select>
                            </label>
                            <label className="drawer-field">
                                <span className="drawer-field-label">Priority</span>
                                <select
                                    className="select"
                                    disabled={!canEditAll}
                                    value={task.priority || 'Medium'}
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
                                    disabled={!canEditAll}
                                    value={task.points ?? task.point ?? 0}
                                    onChange={(e) => handleInputChange('points', e.target.value)}
                                    onBlur={(e) => canEditAll && handleUpdateTaskField({ points: Number(e.target.value) || 0, point: Number(e.target.value) || 0 })}
                                />
                            </label>
                            <label className="drawer-field">
                                <span className="drawer-field-label">Week</span>
                                <input
                                    className="input"
                                    type="number"
                                    min="1"
                                    disabled={!canEditAll}
                                    value={task.week || 1}
                                    onChange={(e) => handleInputChange('week', e.target.value)}
                                    onBlur={(e) => canEditAll && handleUpdateTaskField({ week: Number(e.target.value) || 1 })}
                                />
                            </label>
                            <div className="drawer-field drawer-field--wide">
                                <span className="drawer-field-label">
                                    Assignees{task.assignees?.length > 0 ? ` · ${task.assignees.length}` : ''}
                                </span>
                                <AssigneePicker
                                    members={projectMembers}
                                    selectedIds={task.assignees || []}
                                    canEdit={canEditAll}
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
                            disabled={!canEditAll}
                            placeholder={canEditAll ? 'Add a more detailed description…' : 'No description.'}
                            value={task.description || ''}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                            onBlur={(e) => canEditAll && handleUpdateTaskField({ description: e.target.value })}
                        />
                    </DrawerSection>

                    <ChecklistSection
                        items={task.checklist || []}
                        canToggle={canEditStatus}
                        canAdd={canManageChecklist}
                        canDelete={canManageChecklist}
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

                    {canDelete && (
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

const formatShortDate = (value) => {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

// --- MAIN MY TASKS COMPONENT ---
function MyTasks() {
    const [activeTab, setActiveTab] = useState("all");
    const [tasks, setTasks] = useState([]);
    const [projectMap, setProjectMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchQuery, setSearchQuery] = useState("");

    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Tính toán số task Expiring và phát event cập nhật cho Nav
    const notifyNavToUpdate = useCallback((currentTasks = tasks, pMap = projectMap) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expiringCount = currentTasks.filter((task) => {
            // 1. Kiểm tra trạng thái xem có thuộc Done / Completed không
            if (isTaskCompleted(task)) return false;

            // 2. Xác định ngày hết hạn (dueDate hoặc tính theo tuần dự án)
            const projId = typeof task.projectId === 'object' ? (task.projectId?._id || task.projectId?.id) : task.projectId;
            const projStartDate = (typeof task.projectId === 'object' && task.projectId?.startDate)
                ? task.projectId?.startDate
                : pMap[projId]?.startDate;

            const effectiveDueDate = task.dueDate || calculateDueDateByWeek(projStartDate, task.week || 1);
            if (!effectiveDueDate) return false;

            const dueDate = new Date(effectiveDueDate);
            dueDate.setHours(0, 0, 0, 0);

            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            // Task ở mục Expiring: Còn từ 0 đến 2 ngày nữa hết hạn (bao gồm cả "Due today")
            return diffDays >= 0 && diffDays <= 2;
        }).length;

        window.dispatchEvent(new CustomEvent("myTasksUpdated", { detail: { count: expiringCount } }));
    }, [tasks, projectMap]);

    // Bắn event update mỗi khi danh sách tasks hoặc projectMap có thay đổi
    useEffect(() => {
        notifyNavToUpdate(tasks, projectMap);
    }, [tasks, projectMap, notifyNavToUpdate]);

    const handleOpenDrawer = (taskId) => {
        setSelectedTaskId(taskId);
        setIsDrawerOpen(true);
    };

    const handleCloseDrawer = () => {
        setIsDrawerOpen(false);
        setSelectedTaskId(null);
    };

    const loadMyTasks = async () => {
        try {
            setLoading(true);
            setError(null);

            const data = await fetchMyTasks();
            const realTasks = Array.isArray(data) ? data : (data?.data || []);
            setTasks(realTasks);

            const uniqueProjIds = Array.from(new Set(
                realTasks
                    .map(t => typeof t.projectId === 'object' ? (t.projectId?._id || t.projectId?.id) : t.projectId)
                    .filter(Boolean)
            ));

            // project details only add names / start dates: a failed one is skipped, as before
            const projFetchPromises = uniqueProjIds.map(async (pId) => {
                try {
                    const pData = await fetchProjectById(pId);
                    return { id: pId, data: pData?.data || pData };
                } catch {
                    return null;
                }
            });

            const fetchedProjects = await Promise.all(projFetchPromises);
            const newMap = {};
            fetchedProjects.forEach(item => {
                if (item && item.id && item.data) {
                    newMap[item.id] = item.data;
                }
            });
            setProjectMap(newMap);

        } catch (err) {
            console.error("Lỗi lấy My Tasks:", err);
            setError(err);
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMyTasks();
    }, []);

    // The drawer works with plain ids; the list keeps the populated objects from GET /task/my-task
    // (column title, project name/color, assignee names) and only replaces them when they really changed.
    const handleTaskUpdatedFromDrawer = (updatedTask) => {
        setTasks((prevTasks) =>
            prevTasks.map((t) => {
                if (String(t._id) !== String(updatedTask._id)) return t;
                const next = { ...t, ...updatedTask };
                const newColumnId = extractColumnId(updatedTask.columnId);
                if (typeof t.columnId === 'object' && t.columnId && extractColumnId(t.columnId) === newColumnId) {
                    next.columnId = t.columnId;
                } else if (newColumnId) {
                    next.columnId = { _id: newColumnId, title: updatedTask.columnTitle || '' };
                }
                if (typeof t.projectId === 'object' && t.projectId) next.projectId = t.projectId;
                const ids = (updatedTask.assignees || []).map(a => String(typeof a === 'object' ? (a._id || a.id) : a));
                const known = (t.assignees || []).filter(a => typeof a === 'object' && ids.includes(String(a._id || a.id)));
                if (known.length === ids.length) next.assignees = known;
                return next;
            })
        );
    };

    const handleTaskDeletedFromDrawer = (deletedTaskId) => {
        setTasks((prevTasks) => prevTasks.filter((t) => String(t._id) !== String(deletedTaskId)));
    };

    // Filter danh sách theo Tab
    const filteredTasks = useMemo(() => {
        return tasks.filter((task) => {
            const title = (task.title || task.name || "").toLowerCase();
            const matchesSearch = !searchQuery || title.includes(searchQuery.toLowerCase());
            if (!matchesSearch) return false;

            // Insights summarises every task matching the search
            if (activeTab === "all" || activeTab === "insights") return true;

            // completion is the backend's task.status (set by PUT /task/:id/move), not the column name
            const isDone = isTaskCompleted(task);

            // Tab Completed: Lọc các task có status dạng Done/Completed
            if (activeTab === "completed") {
                return isDone;
            }

            const projId = typeof task.projectId === 'object' ? (task.projectId?._id || task.projectId?.id) : task.projectId;
            const projStartDate = (typeof task.projectId === 'object' && task.projectId?.startDate)
                ? task.projectId?.startDate
                : projectMap[projId]?.startDate;

            const effectiveDueDate = task.dueDate || calculateDueDateByWeek(projStartDate, task.week || 1);
            if (!effectiveDueDate) return false;

            const today = new Date();
            const dueDate = new Date(effectiveDueDate);

            today.setHours(0, 0, 0, 0);
            dueDate.setHours(0, 0, 0, 0);

            const diffTime = dueDate.getTime() - today.getTime();
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (activeTab === "upcoming") return dueDate > today;

            // Tab Expiring: Lọc các task chưa xong và sắp hết hạn trong 0..2 ngày
            if (activeTab === "expiring") {
                if (isDone) return false;
                return diffDays >= 0 && diffDays <= 2;
            }

            if (activeTab === "overdue") return dueDate < today;

            return true;
        });
    }, [tasks, activeTab, searchQuery, projectMap]);

    // same due date as the list: task.dueDate, otherwise the end of its project week
    const getTaskDueDate = useCallback((task) => {
        const projId = typeof task.projectId === 'object' ? (task.projectId?._id || task.projectId?.id) : task.projectId;
        const projStartDate = (typeof task.projectId === 'object' && task.projectId?.startDate)
            ? task.projectId?.startDate
            : projectMap[projId]?.startDate;
        return task.dueDate || calculateDueDateByWeek(projStartDate, task.week || 1);
    }, [projectMap]);

    const showInsights = activeTab === "insights";

    return (
        <>
            <main className="page-content">
                <div className="page-content-inner stack my-tasks-page">
                    <div>
                        <h1>My Tasks</h1>
                        <p className="page-subtitle">Everything assigned to you across all projects.</p>
                    </div>

                    <div className="filter-bar my-tasks-filter">
                        <div className="input-icon-wrap my-tasks-search" role="search">
                            <Search className="icon icon-sm" aria-hidden="true" />
                            <input
                                className="input"
                                type="search"
                                placeholder="Search tasks by title..."
                                aria-label="Search my tasks by title"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pill-tabs" role="group" aria-label="Filter my tasks">
                        <button
                            type="button"
                            aria-pressed={activeTab === "all"}
                            className={`pill-tab ${activeTab === "all" ? "active" : ""}`}
                            onClick={() => setActiveTab('all')}
                        >
                            All
                        </button>
                        <button
                            type="button"
                            aria-pressed={activeTab === "upcoming"}
                            className={`pill-tab ${activeTab === "upcoming" ? "active" : ""}`}
                            onClick={() => setActiveTab('upcoming')}
                        >
                            Upcoming
                        </button>
                        <button
                            type="button"
                            aria-pressed={activeTab === "expiring"}
                            className={`pill-tab ${activeTab === "expiring" ? "active" : ""}`}
                            onClick={() => setActiveTab('expiring')}
                        >
                            Expiring
                        </button>
                        <button
                            type="button"
                            aria-pressed={activeTab === "overdue"}
                            className={`pill-tab ${activeTab === "overdue" ? "active" : ""}`}
                            onClick={() => setActiveTab('overdue')}
                        >
                            Overdue
                        </button>
                        <button
                            type="button"
                            aria-pressed={activeTab === "completed"}
                            className={`pill-tab ${activeTab === "completed" ? "active" : ""}`}
                            onClick={() => setActiveTab('completed')}
                        >
                            Completed
                        </button>
                        <button
                            type="button"
                            aria-pressed={showInsights}
                            className={`pill-tab ${showInsights ? "active" : ""}`}
                            onClick={() => setActiveTab('insights')}
                        >
                            Insights
                        </button>
                    </div>

                    {!loading && !error && showInsights && (
                        <MyTaskInsights tasks={filteredTasks} getDueDate={getTaskDueDate} searchQuery={searchQuery.trim()} />
                    )}

                    {!loading && !error && !showInsights && filteredTasks.length > 0 && (
                        <div className="card my-tasks-list">
                            {filteredTasks.map((task) => {
                                const totalChecklist = task.checklist?.length || 0;
                                const completedChecklist = task.checklist?.filter(i => i.completed)?.length || 0;
                                const statusName = typeof task.columnId === 'object' && task.columnId
                                    ? (task.columnId?.name || task.columnId?.title || "No column")
                                    : (task.columnTitle || (task.columnId ? "No column" : "Backlog"));

                                const projId = typeof task.projectId === 'object' ? (task.projectId?._id || task.projectId?.id) : task.projectId;
                                const projStartDate = (typeof task.projectId === 'object' && task.projectId?.startDate)
                                    ? task.projectId?.startDate
                                    : projectMap[projId]?.startDate;

                                const weekNum = task.week || 1;
                                const remainingText = getRemainingDaysLabel(projStartDate, weekNum);

                                return (
                                    <button
                                        type="button"
                                        key={task._id}
                                        className="task-list-row my-tasks-row"
                                        onClick={() => handleOpenDrawer(task._id)}
                                    >
                                        <div className="task-list-title-cell">
                                            <div className="task-list-title-top">
                                                <span className="priority-badge">
                                                    {task.priority || "Medium"}
                                                </span>
                                                <span className="task-title-text">
                                                    {task.title || task.name}
                                                </span>
                                            </div>

                                            <div className="task-list-title-sub">
                                                <span className="task-list-project-name">
                                                    {typeof task.projectId === 'object' ? (task.projectId?.name || "No project") : (projectMap[projId]?.name || "Project")}
                                                </span>

                                                <span className="task-list-sub-meta">
                                                    <CheckSquare className="icon icon-xs" aria-hidden="true" />
                                                    {completedChecklist}/{totalChecklist}
                                                </span>
                                            </div>
                                        </div>

                                        <span className="task-list-column-cell">
                                            <span
                                                className="project-color-dot"
                                                style={{ background: (typeof task.projectId === 'object' && task.projectId?.color) || "#94a3b8" }}
                                            ></span>
                                            <span>{statusName}</span>

                                            <span className="my-tasks-week" title={`Week ${weekNum}`}>
                                                W{weekNum}
                                            </span>
                                        </span>

                                        <span className="task-list-assignee-cell">
                                            <span className="avatar avatar-sm">
                                                {getInitials(
                                                    task.assignees?.[0]?.username || task.assignees?.[0]?.name || "Me"
                                                )}
                                            </span>
                                        </span>

                                        <span className="task-list-due-cell">
                                            {remainingText}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {loading && (
                        <div className="card my-tasks-state" role="status">
                            <Loader2 className="icon animate-spin" aria-hidden="true" />
                            <span>Loading tasks...</span>
                        </div>
                    )}

                    {!loading && error && (
                        <ErrorState
                            title="Couldn't load your tasks"
                            message={failureMessage({ error })}
                            onRetry={loadMyTasks}
                        />
                    )}

                    {!loading && !error && !showInsights && filteredTasks.length === 0 && (
                        <div className="card">
                            <div className="empty-state my-tasks-empty">
                                <span className="empty-state-icon" aria-hidden="true">
                                    <ClipboardList className="icon" />
                                </span>
                                {tasks.length === 0 ? (
                                    <>
                                        <p className="empty-state-title">No tasks assigned to you</p>
                                        <p className="empty-state-desc">Tasks assigned to you in any project will show up here.</p>
                                    </>
                                ) : (
                                    <>
                                        <p className="empty-state-title">No tasks found</p>
                                        <p className="empty-state-desc">
                                            Nothing matches this view right now.
                                        </p>
                                    </>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </main>

            <TaskDrawer
                taskId={selectedTaskId}
                isDrawerOpen={isDrawerOpen}
                handleCloseDrawer={handleCloseDrawer}
                onTaskUpdated={handleTaskUpdatedFromDrawer}
                onTaskDeleted={handleTaskDeletedFromDrawer}
            />
        </>
    );
}

export default MyTasks;