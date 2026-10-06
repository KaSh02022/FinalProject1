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
    fetchMembersByProject
} from "./../../../api.jsx";
import { Loader2 } from "lucide-react";

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
    if (!startDateStr) return "Chưa đặt";
    const startDate = new Date(startDateStr);
    if (isNaN(startDate.getTime())) return "Chưa đặt";

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

// --- COMPONENT TASK DRAWER ---
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
    const [isSaving, setIsSaving] = useState(false);

    const [checklistText, setChecklistText] = useState('');
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [activities, setActivities] = useState([]);
    const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');

    const currentUserId = getCurrentUserId();

    useEffect(() => {
        if (isDrawerOpen && taskId) {
            setLoading(true);
            setAssigneeSearchQuery('');

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
                            const token = localStorage.getItem("token");
                            const resProj = await fetch(`http://localhost:3000/api/project/${projId}`, {
                                headers: { Authorization: `Bearer ${token}` }
                            });
                            if (resProj.ok) {
                                const pData = await resProj.json();
                                const realProj = pData?.data || pData;
                                pStartDate = realProj?.startDate;
                            }
                        } catch (e) {
                            console.error("Không thể lấy startDate của Project:", e);
                        }
                    }

                    setProjectStartDate(pStartDate);
                    const calculatedDue = calculateDueDateByWeek(pStartDate, realTask.week ?? 1);

                    setTask({
                        ...realTask,
                        title: realTask.title || realTask.name || '',
                        columnId: extractColumnId(realTask.columnId),
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

                    const [commentsData, activitiesData] = await Promise.all([
                        fetchTaskComments(taskId).catch(() => []),
                        fetchTaskActivities(taskId).catch(() => [])
                    ]);
                    setComments(Array.isArray(commentsData) ? commentsData : (commentsData?.data || []));
                    setActivities(Array.isArray(activitiesData) ? activitiesData : (activitiesData?.data || []));
                })
                .catch((err) => console.error("Lỗi khi tải chi tiết task:", err))
                .finally(() => setLoading(false));
        }
    }, [taskId, isDrawerOpen, currentUserId]);

    const isOwnerOrManager = ["Owner", "Manager", "Admin", "Leader"].includes(currentUserRole);
    const isAssignee = task?.assignees?.some(a => {
        const id = typeof a === 'object' ? String(a._id || a.id) : String(a);
        return id === String(currentUserId);
    });

    const canEditAll = isOwnerOrManager;
    const canEditStatus = isOwnerOrManager || isAssignee;
    const canManageChecklist = isOwnerOrManager;
    const canDelete = isOwnerOrManager;

    const filteredProjectMembers = useMemo(() => {
        if (!assigneeSearchQuery.trim()) return projectMembers;
        const query = assigneeSearchQuery.toLowerCase().trim();
        return projectMembers.filter(member => {
            const email = getMemberEmail(member).toLowerCase();
            const name = getMemberDisplayName(member).toLowerCase();
            return email.includes(query) || name.includes(query);
        });
    }, [projectMembers, assigneeSearchQuery]);

    if (!isDrawerOpen) return null;

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
                    points: returnedTask.points ?? returnedTask.point ?? updatedTaskLocal.points,
                };
                setTask(finalTask);
                if (onTaskUpdated) onTaskUpdated(finalTask);
            }
        } catch (error) {
            console.error("Lỗi khi cập nhật task:", error);
            setTask(previousTask);
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
        if (!window.confirm("Bạn có chắc chắn muốn xóa công việc này?")) return;
        try {
            await deleteTask(taskId);
            if (onTaskDeleted) onTaskDeleted(taskId);
            handleCloseDrawer();
        } catch (error) {
            console.error("Lỗi khi xóa task:", error);
        }
    };

    const handleAddChecklist = async () => {
        if (!canManageChecklist || !checklistText.trim()) return;
        const textToSend = checklistText.trim();
        setChecklistText('');

        try {
            const response = await addChecklistItem(taskId, textToSend);
            const realTask = response?.data || response;
            if (realTask && realTask.checklist) {
                setTask(prev => ({ ...prev, checklist: realTask.checklist }));
                if (onTaskUpdated) onTaskUpdated({ ...task, checklist: realTask.checklist });
            }
        } catch (error) {
            console.error("Lỗi khi thêm checklist:", error);
        }
    };

    const handleToggleChecklist = async (itemId, completed) => {
        if (!canEditStatus) return;

        const updatedChecklist = (task.checklist || []).map(item =>
            String(item._id) === String(itemId) ? { ...item, completed: !completed } : item
        );
        setTask(prev => ({ ...prev, checklist: updatedChecklist }));

        try {
            const response = await toggleChecklistItem(taskId, itemId, completed);
            const realTask = response?.data || response;

            if (realTask && realTask.checklist) {
                setTask(prev => ({ ...prev, checklist: realTask.checklist }));
                if (onTaskUpdated) onTaskUpdated({ ...task, checklist: realTask.checklist });
            }
        } catch (error) {
            console.error("Lỗi khi cập nhật checklist:", error);
        }
    };

    const handleDeleteChecklist = async (checklistId) => {
        if (!canManageChecklist) return;

        const previousChecklist = task.checklist;
        const updatedChecklist = (task.checklist || []).filter(
            item => String(item._id) !== String(checklistId)
        );
        setTask(prev => ({ ...prev, checklist: updatedChecklist }));

        try {
            if (typeof deleteChecklist === 'function') {
                await deleteChecklist(checklistId);
            }
        } catch (error) {
            console.error("Lỗi khi xóa checklist:", error);
            setTask(prev => ({ ...prev, checklist: previousChecklist }));
        }
    };

    const handleAddComment = async (e) => {
        e.preventDefault();
        if (!commentText.trim()) return;

        const textToSend = commentText;
        setCommentText('');

        try {
            const newComment = await addComment(taskId, textToSend);
            setComments(prev => [...prev, newComment?.data || newComment]);
        } catch (error) {
            console.error("Lỗi khi gửi bình luận:", error);
        }
    };

    const renderPriorityBadge = (priority) => {
        const priorityConfig = {
            Low: { color: '#2563eb', bg: '#eff6ff' },
            Medium: { color: '#d97706', bg: '#fffbeb' },
            High: { color: '#dc2626', bg: '#fef2f2' },
            Urgent: { color: '#7c3aed', bg: '#f5f3ff' }
        };
        const config = priorityConfig[priority] || priorityConfig.Medium;

        return (
            <span className="priority-badge" style={{ color: config.color, background: config.bg, padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600 }}>
                {priority}
            </span>
        );
    };

    const totalChecklist = task?.checklist?.length || 0;
    const completedChecklist = task?.checklist?.filter(item => item.completed)?.length || 0;
    const progressPercent = totalChecklist > 0 ? Math.round((completedChecklist / totalChecklist) * 100) : 0;

    return (
        <div className={`drawer-overlay ${isDrawerOpen ? "" : "hidden"}`} id="taskDrawer">
            <div className="drawer-panel">
                <div className="drawer-header">
                    <div className="drawer-header-meta" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {renderPriorityBadge(task?.priority || 'Medium')}
                        <span style={{ fontSize: '12px', color: '#6b7280' }}>
                            {isSaving ? "Updating..." : `Role: ${currentUserRole}`}
                        </span>
                    </div>
                    <button className="icon-btn" onClick={handleCloseDrawer} aria-label="Close panel" style={{ cursor: 'pointer' }}>
                        ✕
                    </button>
                </div>

                {loading || !task ? (
                    <div className="drawer-body" style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
                        <Loader2 className="animate-spin" size={32} style={{ margin: '0 auto 12px' }} />
                        <span>Loading...</span>
                    </div>
                ) : (
                    <div className="drawer-body">
                        <textarea
                            className="drawer-title-input"
                            rows="1"
                            disabled={!canEditAll}
                            value={task.title || ''}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            onBlur={(e) => canEditAll && handleUpdateTaskField({ title: e.target.value })}
                            placeholder="Nhập tiêu đề task..."
                        />

                        <div className="drawer-field-grid">
                            <div style={{ gridColumn: 'span 2' }}>
                                <span className="drawer-field-label">Title</span>
                                <input
                                    className="input"
                                    type="text"
                                    disabled={!canEditAll}
                                    value={task.title || ''}
                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                    onBlur={(e) => canEditAll && handleUpdateTaskField({ title: e.target.value })}
                                />
                            </div>

                            {/* Status */}
                            <div>
                                <span className="drawer-field-label">Status</span>
                                <select
                                    className="select"
                                    disabled={!canEditStatus}
                                    value={extractColumnId(task.columnId)}
                                    onChange={(e) => handleUpdateTaskField({ columnId: e.target.value })}
                                >
                                    {columns.length > 0 ? (
                                        columns.map((col) => (
                                            <option key={col._id} value={String(col._id)}>
                                                {col.name || col.title}
                                            </option>
                                        ))
                                    ) : (
                                        <option value={extractColumnId(task.columnId)}>
                                            {typeof task.columnId === 'object' ? (task.columnId?.name || task.columnId?.title) : 'Review'}
                                        </option>
                                    )}
                                </select>
                            </div>

                            {/* Priority */}
                            <div>
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
                            </div>

                            {/* Points */}
                            <div>
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
                            </div>

                            {/* Week */}
                            <div>
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
                            </div>

                            {/* Assignees */}
                            <div style={{ gridColumn: 'span 2' }}>
                                <span className="drawer-field-label">
                                    Assignees {task.assignees?.length > 0 && `(${task.assignees.length} selected)`}
                                </span>

                                {canEditAll && (
                                    <input
                                        className="input"
                                        type="text"
                                        placeholder="Search assignee by email..."
                                        value={assigneeSearchQuery}
                                        onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                                        style={{ marginBottom: '6px', fontSize: '13px' }}
                                    />
                                )}

                                <div className="card" style={{ maxHeight: '140px', overflowY: 'auto', padding: '8px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                    {filteredProjectMembers.map((member, idx) => {
                                        const memberUserId = extractUserId(member);
                                        const memberRecordId = String(member._id || member.id || '');
                                        const name = getMemberDisplayName(member);
                                        const email = getMemberEmail(member);

                                        const isChecked = task.assignees?.some(a => {
                                            const id = typeof a === 'object' ? String(a._id || a.id) : String(a);
                                            return id === String(memberUserId) || id === memberRecordId;
                                        });

                                        return (
                                            <label key={memberRecordId || idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: canEditAll ? 'pointer' : 'default', fontSize: '13px' }}>
                                                <input
                                                    type="checkbox"
                                                    className="checkbox"
                                                    disabled={!canEditAll}
                                                    checked={!!isChecked}
                                                    onChange={() => handleToggleAssignee(member)}
                                                />
                                                <span className="avatar avatar-xs" style={{ background: '#4f46e5', color: '#fff', fontSize: '10px', width: '22px', height: '22px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                    {getInitials(name)}
                                                </span>
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span>{name}</span>
                                                    {email && <span style={{ fontSize: '11px', color: '#6b7280' }}>{email}</span>}
                                                </div>
                                            </label>
                                        );
                                    })}
                                </div>
                            </div>
                        </div>

                        {/* Description */}
                        <div>
                            <span className="drawer-field-label">Description</span>
                            <textarea
                                className="textarea"
                                rows="3"
                                disabled={!canEditAll}
                                placeholder="Add a more detailed description…"
                                value={task.description || ''}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                onBlur={(e) => canEditAll && handleUpdateTaskField({ description: e.target.value })}
                            />
                        </div>

                        {/* Checklist Section */}
                        <div className="drawer-section">
                            <div className="checklist-header" style={{ display: 'flex', justifyContent: 'space-between' }}>
                                <span className="comments-title">Checklist</span>
                                <span className="checklist-count">{completedChecklist}/{totalChecklist}</span>
                            </div>
                            <div className="progress-bar" style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', margin: '8px 0 12px' }}>
                                <span
                                    className="progress-bar-fill tone-success"
                                    style={{ display: 'block', height: '100%', background: '#22c55e', width: `${progressPercent}%` }}
                                ></span>
                            </div>
                            <div className="checklist-items" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {task.checklist?.map((item, index) => (
                                    <div key={item._id || index} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                        <label className="checklist-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: canEditStatus ? 'pointer' : 'default', flex: 1 }}>
                                            <input
                                                type="checkbox"
                                                className="checkbox"
                                                disabled={!canEditStatus}
                                                checked={item.completed || false}
                                                onChange={() => handleToggleChecklist(item._id, item.completed)}
                                            />
                                            <span style={{ textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? '#9ca3af' : 'inherit' }}>
                                                {item.text || item.title}
                                            </span>
                                        </label>

                                        {canManageChecklist && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteChecklist(item._id)}
                                                style={{ background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '2px 6px' }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {canManageChecklist && (
                                <div className="checklist-add-row" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    <input
                                        className="input"
                                        placeholder="Add checklist item…"
                                        value={checklistText}
                                        onChange={(e) => setChecklistText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()}
                                    />
                                    <button className="checklist-add-btn btn btn-secondary" onClick={handleAddChecklist}>+</button>
                                </div>
                            )}
                        </div>

                        {/* Comments Section */}
                        <div className="drawer-section">
                            <p className="comments-title" style={{ fontWeight: 600, marginBottom: '8px' }}>Comments</p>
                            <div className="comments-list" style={{ marginBottom: '12px' }}>
                                {comments.length === 0 ? (
                                    <p className="empty-state-desc">No comments yet</p>
                                ) : (
                                    comments.map((comment, idx) => (
                                        <div key={comment._id || idx} style={{ marginBottom: '8px', fontSize: '14px' }}>
                                            <strong>{comment.user?.username || comment.user?.name || 'User'}: </strong>
                                            <span>{comment.text}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <form onSubmit={handleAddComment}>
                                <textarea
                                    className="textarea"
                                    rows="2"
                                    placeholder="Write a comment…"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                />
                                <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                    <button type="submit" className="btn btn-primary btn-sm">Send</button>
                                </div>
                            </form>
                        </div>

                        {/* Activities Section */}
                        <div className="drawer-section">
                            <p className="comments-title" style={{ fontWeight: 600, marginBottom: '8px' }}>Activities</p>
                            <ol className="timeline" style={{ paddingLeft: '16px', fontSize: '13px', color: '#4b5563' }}>
                                {activities.map((act, index) => (
                                    <li key={act._id || index} className="timeline-item" style={{ marginBottom: '6px' }}>
                                        <strong>{act.user?.username || act.user?.name || 'User'}</strong> {act.action || 'đã thao tác'}
                                    </li>
                                ))}
                            </ol>
                        </div>

                        {/* Delete Task Section */}
                        {canDelete && (
                            <div className="drawer-section" style={{ marginTop: '24px' }}>
                                <button
                                    className="btn btn-outline btn-full"
                                    style={{ color: '#dc2626', borderColor: '#fca5a5', width: '100%' }}
                                    onClick={handleDeleteTask}
                                >
                                    Delete task
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

// --- MAIN MY TASKS COMPONENT ---
function MyTasks() {
    const [activeTab, setActiveTab] = useState("all");
    const [tasks, setTasks] = useState([]);
    const [projectMap, setProjectMap] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [searchQuery, setSearchQuery] = useState("");

    const [selectedTaskId, setSelectedTaskId] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    // Tính toán số task Expiring và phát event cập nhật cho Nav
    const notifyNavToUpdate = useCallback((currentTasks = tasks, pMap = projectMap) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        const expiringCount = currentTasks.filter((task) => {
            // 1. Kiểm tra trạng thái xem có thuộc Done / Completed không
            const statusName = (typeof task.columnId === 'object'
                ? (task.columnId?.name || task.columnId?.title || "")
                : "").toLowerCase();
            const isDone = statusName.includes('done') || statusName.includes('completed');
            if (isDone) return false;

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
            setError("");

            const token = localStorage.getItem("token");
            const res = await fetch("http://localhost:3000/api/task/my-task", {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            if (!res.ok) {
                throw new Error(`HTTP error: ${res.status}`);
            }

            const data = await res.json();
            const realTasks = Array.isArray(data) ? data : (data?.data || []);
            setTasks(realTasks);

            const uniqueProjIds = Array.from(new Set(
                realTasks
                    .map(t => typeof t.projectId === 'object' ? (t.projectId?._id || t.projectId?.id) : t.projectId)
                    .filter(Boolean)
            ));

            const projFetchPromises = uniqueProjIds.map(async (pId) => {
                try {
                    const resProj = await fetch(`http://localhost:3000/api/project/${pId}`, {
                        headers: { Authorization: `Bearer ${token}` }
                    });
                    if (resProj.ok) {
                        const pData = await resProj.json();
                        return { id: pId, data: pData?.data || pData };
                    }
                } catch {
                    return null;
                }
                return null;
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
            setError("Không thể tải danh sách công việc.");
            setTasks([]);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadMyTasks();
    }, []);

    const handleTaskUpdatedFromDrawer = (updatedTask) => {
        setTasks((prevTasks) =>
            prevTasks.map((t) =>
                String(t._id) === String(updatedTask._id) ? { ...t, ...updatedTask } : t
            )
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

            if (activeTab === "all") return true;

            const statusName = (typeof task.columnId === 'object'
                ? (task.columnId?.name || task.columnId?.title || "")
                : "").toLowerCase();
            const isDone = statusName.includes('done') || statusName.includes('completed');

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

    return (
        <>
            <main className="page-content">
                <div className="page-content-inner stack" style={{ gap: 'var(--space-4)' }}>
                    <div>
                        <h1>My Tasks</h1>
                        <p className="page-subtitle">Everything assigned to you across all projects.</p>
                    </div>

                    <div className="filter-bar" style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '12px' }}>
                        <div className="input-icon-wrap" style={{ flex: 1 }}>
                            <input
                                className="input"
                                placeholder="Search tasks by title..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>

                    <div className="pill-tabs">
                        <button
                            className={`pill-tab ${activeTab === "all" ? "active" : ""}`}
                            onClick={() => setActiveTab('all')}
                        >
                            All
                        </button>
                        <button
                            className={`pill-tab ${activeTab === "upcoming" ? "active" : ""}`}
                            onClick={() => setActiveTab('upcoming')}
                        >
                            Upcoming
                        </button>
                        <button
                            className={`pill-tab ${activeTab === "expiring" ? "active" : ""}`}
                            onClick={() => setActiveTab('expiring')}
                        >
                            Expiring
                        </button>
                        <button
                            className={`pill-tab ${activeTab === "overdue" ? "active" : ""}`}
                            onClick={() => setActiveTab('overdue')}
                        >
                            Overdue
                        </button>
                        <button
                            className={`pill-tab ${activeTab === "completed" ? "active" : ""}`}
                            onClick={() => setActiveTab('completed')}
                        >
                            Completed
                        </button>
                    </div>

                    {!loading && !error && filteredTasks.length > 0 && (
                        <div className="card">
                            {filteredTasks.map((task) => {
                                const totalChecklist = task.checklist?.length || 0;
                                const completedChecklist = task.checklist?.filter(i => i.completed)?.length || 0;
                                const statusName = typeof task.columnId === 'object'
                                    ? (task.columnId?.name || task.columnId?.title || "No status")
                                    : "Review";

                                const projId = typeof task.projectId === 'object' ? (task.projectId?._id || task.projectId?.id) : task.projectId;
                                const projStartDate = (typeof task.projectId === 'object' && task.projectId?.startDate)
                                    ? task.projectId?.startDate
                                    : projectMap[projId]?.startDate;

                                const weekNum = task.week || 1;
                                const remainingText = getRemainingDaysLabel(projStartDate, weekNum);

                                return (
                                    <button
                                        key={task._id}
                                        className="task-list-row"
                                        onClick={() => handleOpenDrawer(task._id)}
                                        style={{ width: '100%', textAlign: 'left', cursor: 'pointer' }}
                                    >
                                        <div className="task-list-title-cell">
                                            <div className="task-list-title-top">
                                                <span className="priority-badge">
                                                    {task.priority || "Medium"}
                                                </span>
                                                <span className="task-title-text" style={{ fontWeight: 500 }}>
                                                    {task.title || task.name}
                                                </span>
                                            </div>

                                            <div className="task-list-title-sub">
                                                <span className="task-list-project-name">
                                                    {typeof task.projectId === 'object' ? (task.projectId?.name || "No project") : (projectMap[projId]?.name || "Project")}
                                                </span>

                                                <span className="task-list-sub-meta">
                                                    <span className="icon icon-xs">☑</span>
                                                    {completedChecklist}/{totalChecklist}
                                                </span>
                                            </div>
                                        </div>

                                        <span className="task-list-column-cell" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                            <span
                                                className="project-color-dot"
                                                style={{ background: (typeof task.projectId === 'object' && task.projectId?.color) || "#94a3b8" }}
                                            ></span>
                                            <span>{statusName}</span>

                                            <span style={{
                                                fontSize: '11px',
                                                padding: '2px 6px',
                                                borderRadius: '4px',
                                                background: '#f3f4f6',
                                                color: '#4b5563',
                                                fontWeight: 500
                                            }}>
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
                        <div className="card">
                            <div className="empty-state" style={{ padding: '32px 0', textAlign: 'center' }}>
                                <p className="empty-state-title">Loading tasks...</p>
                            </div>
                        </div>
                    )}

                    {!loading && error && (
                        <div className="card">
                            <div className="empty-state" style={{ padding: '32px 0', textAlign: 'center' }}>
                                <p className="empty-state-title">{error}</p>
                            </div>
                        </div>
                    )}

                    {!loading && !error && filteredTasks.length === 0 && (
                        <div className="card">
                            <div className="empty-state" style={{ padding: '32px 0', textAlign: 'center' }}>
                                <p className="empty-state-title">No tasks found</p>
                                <p className="empty-state-desc">
                                    Nothing matches this view right now.
                                </p>
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