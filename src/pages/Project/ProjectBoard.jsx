import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
// Import socket instance từ file socket.js của bạn
import {socket} from './../../utils/socket.js';
import Header from './../../components/layout/Header/Header.jsx';
import Sidebar from './../../components/layout/Sidebar/SideBar.jsx';
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
    moveTask,
} from './../../../api.jsx';
import "./project.css";
import {
    Calendar,
    CalendarClock,
    LayoutGrid,
    List,
    ListChecks,
    Settings,
    UsersRound,
    Loader2,
    Check,
    X,
    Info,
    BarChart2
} from "lucide-react";

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
// COMPONENT TASK DRAWER
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
                        currentUserId = null
                    }) {
    const [task, setTask] = useState(null);
    const [loading, setLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    const [checklistText, setChecklistText] = useState('');
    const [comments, setComments] = useState([]);
    const [commentText, setCommentText] = useState('');
    const [activities, setActivities] = useState([]);
    const [assigneeSearchQuery, setAssigneeSearchQuery] = useState('');

    const canEditAll = isManager;
    const canEditManagement = isManager || isLeader;
    const canDeleteTask = isManager;
    const canAddChecklist = isManager || isLeader;
    const canDeleteChecklist = isManager || isLeader;

    useEffect(() => {
        if (isDrawerOpen && taskId) {
            setLoading(true);
            setAssigneeSearchQuery('');
            Promise.all([
                fetchTaskById(taskId),
                fetchTaskComments(taskId).catch(() => []),
                fetchTaskActivities(taskId).catch(() => [])
            ])
                .then(([taskData, commentsData, activitiesData]) => {
                    const realTask = taskData?.data || taskData;

                    const formattedAssignees = Array.isArray(realTask.assignees)
                        ? realTask.assignees.map(a => typeof a === 'object' ? String(a._id || a.id) : String(a))
                        : [];

                    setTask({
                        ...realTask,
                        name: realTask.name || realTask.title || '',
                        columnId: extractColumnId(realTask.columnId),
                        assignees: formattedAssignees,
                        points: realTask.points ?? realTask.point ?? 0,
                        week: realTask.week ?? 1
                    });
                    setComments(Array.isArray(commentsData) ? commentsData : (commentsData?.data || []));
                    setActivities(Array.isArray(activitiesData) ? activitiesData : (activitiesData?.data || []));
                })
                .catch((err) => console.error("Lỗi khi tải chi tiết task:", err))
                .finally(() => setLoading(false));
        }
    }, [taskId, isDrawerOpen]);

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
            updatedFields.week = Number(updatedFields.week) || 1;
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
                    week: returnedTask.week ?? updatedTaskLocal.week
                };
                setTask(finalTask);
                if (onTaskUpdated) onTaskUpdated(finalTask);
            }
        } catch (error) {
            console.error("Lỗi khi cập nhật task, đang hoàn tác:", error);
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
        if (!window.confirm("Bạn có chắc chắn muốn xóa task này?")) return;
        try {
            await deleteTask(taskId);
            if (onTaskDeleted) onTaskDeleted(taskId);
            handleCloseDrawer();
        } catch (error) {
            console.error("Lỗi khi xóa task:", error);
        }
    };

    const handleAddChecklist = async () => {
        if (!canAddChecklist || !checklistText.trim()) return;

        const textToSend = checklistText.trim();
        setChecklistText('');

        try {
            const response = await addChecklistItem(taskId, textToSend);
            const realTask = response?.data || response;
            if (realTask && realTask.checklist) {
                setTask(prev => ({ ...prev, checklist: realTask.checklist }));
            }
        } catch (error) {
            console.error("Lỗi khi thêm checklist:", error);
        }
    };

    const handleToggleChecklist = async (itemId, completed) => {
        const updatedChecklist = (task.checklist || []).map(item =>
            String(item._id) === String(itemId) ? { ...item, completed: !completed } : item
        );
        setTask(prev => ({ ...prev, checklist: updatedChecklist }));

        try {
            const response = await toggleChecklistItem(taskId, itemId, completed);
            const realTask = response?.data || response;

            if (realTask && realTask.checklist) {
                setTask(prev => ({ ...prev, checklist: realTask.checklist }));
            }
        } catch (error) {
            console.error("Lỗi khi cập nhật checklist:", error);
            setTask(prev => ({ ...prev, checklist: task.checklist }));
        }
    };

    const handleDeleteChecklist = async (checklistId) => {
        if (!canDeleteChecklist) return;
        if (!window.confirm("Bạn có chắc chắn muốn xóa checklist này?")) return;

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
            <span className="priority-badge" style={{ color: config.color, background: config.bg, padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                <span className="icon icon-xs">
                    <svg viewBox="0 0 24 24" width="14" height="14" stroke="currentColor" fill="none" strokeWidth="2">
                        <path d="M12 5v14"></path>
                        <path d="m19 12-7 7-7-7"></path>
                    </svg>
                </span>
                <span>{priority}</span>
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
                        <span style={{ fontSize: '12px', color: '#6b7280', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {isSaving ? (
                                <>
                                    <Loader2 className="animate-spin" size={14} />
                                    <span>Updating...</span>
                                </>
                            ) : (
                                task?.updatedAt ? `Updated ${formatDateDMY(task.updatedAt)}` : 'Recently'
                            )}
                        </span>
                    </div>
                    <button className="icon-btn" onClick={handleCloseDrawer} aria-label="Close panel" style={{ cursor: 'pointer' }}>
                        <span className="icon">
                            <svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" fill="none" strokeWidth="2">
                                <path d="M18 6 6 18"></path>
                                <path d="m6 6 12 12"></path>
                            </svg>
                        </span>
                    </button>
                </div>

                {loading || !task ? (
                    <div className="drawer-body" style={{ padding: '48px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px', color: '#6b7280' }}>
                        <Loader2 className="animate-spin" size={32} style={{ color: '#4f46e5' }} />
                        <span>Loading...</span>
                    </div>
                ) : (
                    <div className="drawer-body">
                        <textarea
                            className="drawer-title-input"
                            rows="1"
                            value={task.title || ''}
                            readOnly={!canEditManagement}
                            style={{ cursor: canEditManagement ? 'text' : 'not-allowed' }}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                            onBlur={(e) => handleUpdateTaskField({ title: e.target.value })}
                            placeholder="Nhập tiêu đề task..."
                        />

                        <div className="drawer-field-grid">
                            <div style={{ gridColumn: 'span 2' }}>
                                <span className="drawer-field-label">Title</span>
                                <input
                                    className="input"
                                    type="text"
                                    value={task.title || ''}
                                    readOnly={!canEditAll}
                                    disabled={!canEditAll}
                                    style={{
                                        backgroundColor: canEditAll ? '#ffffff' : '#f3f4f6',
                                        cursor: canEditAll ? 'text' : 'not-allowed',
                                        color: '#374151',
                                        fontWeight: 500
                                    }}
                                    onChange={(e) => handleInputChange('title', e.target.value)}
                                    onBlur={(e) => handleUpdateTaskField({ title: e.target.value })}
                                    placeholder="Task's title"
                                />
                            </div>

                            <div>
                                <span className="drawer-field-label">Status</span>
                                <select
                                    className="select"
                                    value={extractColumnId(task.columnId)}
                                    disabled={!canEditAll}
                                    style={{ backgroundColor: canEditAll ? '#ffffff' : '#f3f4f6', cursor: canEditAll ? 'pointer' : 'not-allowed' }}
                                    onChange={(e) => handleUpdateTaskField({ columnId: e.target.value })}
                                >
                                    {columns.map((col) => (
                                        <option key={col._id} value={String(col._id)}>
                                            {col.name || col.title}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <span className="drawer-field-label">Priority</span>
                                <select
                                    className="select"
                                    value={task.priority || 'Medium'}
                                    disabled={!canEditAll}
                                    style={{ backgroundColor: canEditAll ? '#ffffff' : '#f3f4f6', cursor: canEditAll ? 'pointer' : 'not-allowed' }}
                                    onChange={(e) => handleUpdateTaskField({ priority: e.target.value })}
                                >
                                    <option value="Low">Low</option>
                                    <option value="Medium">Medium</option>
                                    <option value="High">High</option>
                                    <option value="Urgent">Urgent</option>
                                </select>
                            </div>

                            <div>
                                <span className="drawer-field-label">Points</span>
                                <input
                                    className="input"
                                    type="number"
                                    min="0"
                                    value={task.points ?? task.point ?? 0}
                                    disabled={!canEditAll}
                                    style={{ backgroundColor: canEditAll ? '#ffffff' : '#f3f4f6', cursor: canEditAll ? 'text' : 'not-allowed' }}
                                    onChange={(e) => handleInputChange('points', e.target.value)}
                                    onBlur={(e) => handleUpdateTaskField({ points: Number(e.target.value) || 0, point: Number(e.target.value) || 0 })}
                                />
                            </div>

                            <div>
                                <span className="drawer-field-label">Week</span>
                                <select
                                    className="select"
                                    value={task.week || 1}
                                    disabled={!canEditAll}
                                    style={{ backgroundColor: canEditAll ? '#ffffff' : '#f3f4f6', cursor: canEditAll ? 'pointer' : 'not-allowed' }}
                                    onChange={(e) => handleUpdateTaskField({ week: Number(e.target.value) })}
                                >
                                    {Array.from({ length: maxWeeks }, (_, i) => i + 1).map(w => (
                                        <option key={w} value={w}>Week {w}</option>
                                    ))}
                                </select>
                            </div>

                            <div style={{ gridColumn: 'span 2' }}>
                                <span className="drawer-field-label">
                                    Assignees {task.assignees?.length > 0 && `(${task.assignees.length} selected)`}
                                </span>

                                <input
                                    className="input"
                                    type="text"
                                    placeholder="Search assignee by email..."
                                    value={assigneeSearchQuery}
                                    onChange={(e) => setAssigneeSearchQuery(e.target.value)}
                                    style={{ marginBottom: '6px', fontSize: '13px' }}
                                />

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
                                            <label key={memberRecordId || idx} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: canEditManagement ? 'pointer' : 'not-allowed', fontSize: '13px' }}>
                                                <input
                                                    type="checkbox"
                                                    className="checkbox"
                                                    checked={!!isChecked}
                                                    disabled={!canEditManagement}
                                                    style={{ cursor: canEditManagement ? 'pointer' : 'not-allowed' }}
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

                        <div>
                            <span className="drawer-field-label">Description</span>
                            <textarea
                                className="textarea"
                                rows="3"
                                placeholder="Add a more detailed description…"
                                value={task.description || ''}
                                readOnly={!canEditAll}
                                style={{ backgroundColor: canEditAll ? '#ffffff' : '#f3f4f6', cursor: canEditAll ? 'text' : 'not-allowed' }}
                                onChange={(e) => handleInputChange('description', e.target.value)}
                                onBlur={(e) => handleUpdateTaskField({ description: e.target.value })}
                            />
                        </div>

                        <div className="drawer-section">
                            <div className="checklist-header" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                                <span className="comments-title">Checklists</span>
                                <span className="checklist-count">{completedChecklist}/{totalChecklist}</span>
                            </div>
                            <div className="progress-bar" style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', marginBottom: '12px', overflow: 'hidden' }}>
                                <span
                                    className="progress-bar-fill tone-success"
                                    style={{ display: 'block', height: '100%', background: '#22c55e', width: `${progressPercent}%`, transition: 'width 0.3s' }}
                                ></span>
                            </div>
                            <div className="checklist-items" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                {task.checklist && task.checklist.map((item, index) => (
                                    <div
                                        key={item._id || index}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '2px 0' }}
                                    >
                                        <label className="checklist-item" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', flex: 1 }}>
                                            <input
                                                type="checkbox"
                                                className="checkbox"
                                                checked={item.completed || false}
                                                style={{ cursor: 'pointer' }}
                                                onChange={() => handleToggleChecklist(item._id, item.completed)}
                                            />
                                            <span className={`checklist-text ${item.completed ? 'completed' : ''}`} style={{ textDecoration: item.completed ? 'line-through' : 'none', color: item.completed ? '#9ca3af' : 'inherit', cursor: 'pointer' }}>
                                                {item.text || item.title}
                                            </span>
                                        </label>

                                        {canDeleteChecklist && (
                                            <button
                                                type="button"
                                                onClick={() => handleDeleteChecklist(item._id)}
                                                title="Xóa checklist"
                                                style={{
                                                    background: 'transparent',
                                                    border: 'none',
                                                    color: '#ef4444',
                                                    cursor: 'pointer',
                                                    fontSize: '14px',
                                                    fontWeight: 'bold',
                                                    padding: '0 6px',
                                                    lineHeight: 1
                                                }}
                                            >
                                                ✕
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {canAddChecklist && (
                                <div className="checklist-add-row" style={{ display: 'flex', gap: '8px', marginTop: '12px' }}>
                                    <input
                                        className="input"
                                        placeholder="Add checklist item…"
                                        value={checklistText}
                                        onChange={(e) => setChecklistText(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleAddChecklist()}
                                    />
                                    <button className="checklist-add-btn btn btn-secondary" onClick={handleAddChecklist} aria-label="Add checklist item" style={{ cursor: 'pointer' }}>
                                        +
                                    </button>
                                </div>
                            )}
                        </div>

                        <div className="drawer-section">
                            <p className="comments-title" style={{ fontWeight: 600, marginBottom: '8px' }}>Comments</p>
                            <div className="comments-list" style={{ marginBottom: '12px' }}>
                                {comments.length === 0 ? (
                                    <div className="empty-state" style={{ padding: '16px 0', textAlign: 'center' }}>
                                        <p className="empty-state-title" style={{ fontSize: '14px', color: '#6b7280' }}>No comments yet</p>
                                    </div>
                                ) : (
                                    comments.map((comment, idx) => (
                                        <div key={comment._id || idx} className="comment-item" style={{ marginBottom: '8px', fontSize: '14px' }}>
                                            <strong>{comment.user?.username || comment.user?.name || 'User'}: </strong>
                                            <span>{comment.text}</span>
                                        </div>
                                    ))
                                )}
                            </div>
                            <form className="comment-form" onSubmit={handleAddComment}>
                                <textarea
                                    className="textarea"
                                    rows="2"
                                    placeholder="Write a comment…"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                />
                                <div className="comment-form-actions" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px' }}>
                                    <button type="submit" className="btn btn-primary btn-sm" style={{ cursor: 'pointer' }}>Send</button>
                                </div>
                            </form>
                        </div>

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

                        {canDeleteTask && (
                            <div className="drawer-section" style={{ marginTop: '24px' }}>
                                <button
                                    className="btn btn-outline btn-full"
                                    style={{ color: '#dc2626', borderColor: '#fca5a5', width: '100%', cursor: 'pointer' }}
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

    const [searchQuery, setSearchQuery] = useState('');
    const [selectedWeek, setSelectedWeek] = useState('all');

    const [activeModal, setActiveModal] = useState(null);
    const [isColumnFixed, setIsColumnFixed] = useState(false);

    const [selectedTaskId, setSelectedTaskId] = useState(null);
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

        try {
            setLoading(true);

            const [projectData, columnsData, tasksData, membersData] = await Promise.all([
                fetchProjectById(activeProjectId).catch(() => null),
                fetchColumnsByProject(activeProjectId).catch(() => []),
                fetchTasksByProject(activeProjectId).catch(() => []),
                fetchMembersByProject(activeProjectId).catch(() => [])
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
        } finally {
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

        // Hủy đăng ký listener và rời room khi unmount
        return () => {
            socket.emit('leave_project', activeProjectId);
            socket.off('task_created', handleTaskCreated);
            socket.off('task_updated', handleTaskUpdated);
            socket.off('task_moved', handleTaskMoved);
            socket.off('task_deleted', handleTaskDeleted);
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

    const getCurrentUserId = () => {
        return currentUser._id || currentUser.id || null;
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
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: '12px', color: '#6b7280' }}>
                <Loader2 className="animate-spin" size={40} style={{ color: '#4f46e5' }} />
                <span style={{ fontSize: '15px', fontWeight: 500 }}>Loading...</span>
            </div>
        );
    }

    const formattedStartDate = formatDateDMY(project?.startDate || project?.createdDate || project?.createdAt);
    const formattedDueDate = formatDateDMY(project?.date || project?.dueDate || project?.endDate);

    return (
        <div className="app-shell">
            <Sidebar />

            <div className="app-main">
                <Header onOpenModal={(modal) => setActiveModal(modal)} />

                <div className="project-header">
                    <div className="project-header-top">
                        <div>
                            <div className="project-title-row">
                                <span className="project-color-dot" style={{ background: project?.color || '#4f46e5' }}></span>
                                <h1>{project?.name || 'Dự án'}</h1>
                            </div>
                            <p className="page-subtitle">{project?.description || 'No description'}</p>

                            <div className="project-meta-row">
                                <span className="project-meta-item"><UsersRound className="icon icon-sm" />{projectMembers.length} members</span>
                                <span className="project-meta-item"><ListChecks className="icon icon-sm" />{tasks.length} tasks</span>
                                <span className="project-meta-item"><Calendar className="icon icon-sm" />start date: {formattedStartDate}</span>
                                <span className="project-meta-item"><CalendarClock className="icon icon-sm" />end date: {formattedDueDate}</span>
                            </div>
                        </div>
                        <Link to={`/projectsetting/${activeProjectId}`} className="icon-btn icon-btn-outline" style={{ cursor: 'pointer' }}>
                            <Settings className="icon" />
                        </Link>
                    </div>
                    <nav className="project-tabs">
                        <Link to={`/projectoverview/${activeProjectId}`} className="project-tab">
                            <Info className="icon icon-sm" /> Overview
                        </Link>
                        <Link to={`/projectchart/${activeProjectId}`} className="project-tab">
                            <BarChart2 className="icon icon-sm" /> Chart
                        </Link>
                        <Link to={`/projectboard/${activeProjectId}`} className="project-tab active">
                            <LayoutGrid className="icon icon-sm" /> Board
                        </Link>
                        <Link to={`/projectlist/${activeProjectId}`} className="project-tab">
                            <List className="icon icon-sm" /> Backlog
                        </Link>
                        <Link to={`/projectcalendar/${activeProjectId}`} className="project-tab">
                            <Calendar className="icon icon-sm" /> Calendar
                        </Link>
                    </nav>
                </div>

                <main className="page-content">
                    <div className="filter-bar" style={{ display: 'flex', gap: '12px', marginBottom: '16px', alignItems: 'center' }}>
                        <div className="input-icon-wrap" style={{ width: '260px', flexShrink: 0 }}>
                            <span className="input-icon">🔍</span>
                            <input
                                className="input"
                                placeholder="Search task name..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                style={{ width: '100%' }}
                            />
                        </div>

                        <div style={{ width: '150px', flexShrink: 0 }}>
                            <select
                                className="select"
                                value={selectedWeek}
                                onChange={(e) => setSelectedWeek(e.target.value)}
                                style={{ cursor: 'pointer', height: '100%' }}
                            >
                                <option value="all">All Weeks</option>
                                {Array.from({ length: totalProjectWeeks }, (_, i) => i + 1).map(w => (
                                    <option key={w} value={w}>Week {w}</option>
                                ))}
                            </select>
                        </div>

                        {canCreateTask && (
                            <button
                                className="btn btn-primary"
                                style={{ marginLeft: 'auto', flexShrink: 0, cursor: 'pointer' }}
                                onClick={() => handleOpenCreateModal('', false)}
                            >
                                + Add Task
                            </button>
                        )}
                    </div>

                    <DragDropContext onDragEnd={handleOnDragEnd}>
                        <div className="board scroll-x" id="kanbanBoard">
                            {columns.map((column) => {
                                const columnTasks = getSortedTasksForColumn(column);
                                const isDoneColumn = (column.name || column.title || '').toLowerCase().includes('done');

                                return (
                                    <div className="board-column" key={column._id}>
                                        <div className="board-column-header">
                                            <span className="board-column-title">{column.name || column.title}</span>
                                            <span className="board-column-count">{columnTasks.length}</span>
                                            {canCreateTask && (
                                                <button
                                                    className="btn-icon"
                                                    style={{ marginLeft: 'auto', cursor: 'pointer' }}
                                                    onClick={() => handleOpenCreateModal(column._id, true)}
                                                    title="Thêm task vào cột này"
                                                >
                                                    +
                                                </button>
                                            )}
                                        </div>

                                        <Droppable droppableId={String(column._id)}>
                                            {(provided, snapshot) => (
                                                <div
                                                    className="board-column-body"
                                                    ref={provided.innerRef}
                                                    {...provided.droppableProps}
                                                    style={{
                                                        minHeight: '150px',
                                                        backgroundColor: snapshot.isDraggingOver ? 'rgba(79, 70, 229, 0.05)' : 'transparent',
                                                        transition: 'background-color 0.2s cubic-bezier(0.2, 0, 0, 1)',
                                                        borderRadius: '8px',
                                                        padding: '4px'
                                                    }}
                                                >
                                                    {columnTasks.length === 0 ? (
                                                        <div className="empty-state" style={{ padding: '24px 0' }}>
                                                            <div className="empty-state-desc">
                                                                {searchQuery || selectedWeek !== 'all' ? 'Not found' : 'Empty'}
                                                            </div>
                                                        </div>
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

                                                            return (
                                                                <Draggable
                                                                    key={String(task._id || task.id)}
                                                                    draggableId={String(task._id || task.id)}
                                                                    index={index}
                                                                    isDragDisabled={!canDragThisTask}
                                                                >
                                                                    {(provided, snapshot) => (
                                                                        <div
                                                                            className="task-card"
                                                                            ref={provided.innerRef}
                                                                            {...provided.draggableProps}
                                                                            {...provided.dragHandleProps}
                                                                            onClick={() => handleOpenTaskDrawer(task._id || task.id)}
                                                                            style={{
                                                                                ...provided.draggableProps.style,
                                                                                opacity: snapshot.isDragging ? 0.9 : 1,
                                                                                transform: snapshot.isDragging
                                                                                    ? `${provided.draggableProps.style?.transform} scale(1.02) translateY(-2px)`
                                                                                    : provided.draggableProps.style?.transform,
                                                                                boxShadow: snapshot.isDragging
                                                                                    ? '0 12px 20px -5px rgba(79, 70, 229, 0.25), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
                                                                                    : '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
                                                                                transition: snapshot.isDragging
                                                                                    ? 'box-shadow 0.2s ease, transform 0.1s ease'
                                                                                    : 'transform 0.2s cubic-bezier(0.2, 0, 0, 1), box-shadow 0.2s ease',
                                                                                cursor: canDragThisTask
                                                                                    ? (snapshot.isDragging ? 'grabbing' : 'grab')
                                                                                    : 'pointer',
                                                                                marginBottom: '8px',
                                                                                position: 'relative',
                                                                                backgroundColor: '#ffffff',
                                                                                borderRadius: '8px'
                                                                            }}
                                                                        >
                                                                            <div
                                                                                className="task-card-top"
                                                                                style={{
                                                                                    display: 'flex',
                                                                                    justifyContent: 'space-between',
                                                                                    alignItems: 'flex-start',
                                                                                    gap: '8px',
                                                                                    marginBottom: '8px',
                                                                                    paddingRight: showNotAcceptBtn ? '32px' : '0'
                                                                                }}
                                                                            >
                                                                                <div className="task-card-title" style={{ flex: 1, margin: 0, fontWeight: 500 }}>
                                                                                    {task.title || task.name}
                                                                                </div>

                                                                                <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                                                                                    {status === 'Overdue' && (
                                                                                        <span
                                                                                            title="Task đã quá hạn dự án"
                                                                                            style={{
                                                                                                background: '#fef2f2',
                                                                                                color: '#dc2626',
                                                                                                border: '1px solid #fca5a5',
                                                                                                borderRadius: '12px',
                                                                                                padding: '1px 7px',
                                                                                                fontSize: '11px',
                                                                                                fontWeight: 600,
                                                                                                lineHeight: '16px',
                                                                                                whiteSpace: 'nowrap'
                                                                                            }}
                                                                                        >
                                                                                            Overdue
                                                                                        </span>
                                                                                    )}

                                                                                    {status === 'Expiring' && (
                                                                                        <span
                                                                                            title="Task sắp hết hạn tuần"
                                                                                            style={{
                                                                                                background: '#fef3c7',
                                                                                                color: '#d97706',
                                                                                                border: '1px solid #fde68a',
                                                                                                borderRadius: '12px',
                                                                                                padding: '1px 7px',
                                                                                                fontSize: '11px',
                                                                                                fontWeight: 600,
                                                                                                lineHeight: '16px',
                                                                                                whiteSpace: 'nowrap'
                                                                                            }}
                                                                                        >
                                                                                            Expiring
                                                                                        </span>
                                                                                    )}

                                                                                    {status === 'On Track' && (
                                                                                        <span
                                                                                            title="Task đang đúng tiến độ"
                                                                                            style={{
                                                                                                background: '#dcfce7',
                                                                                                color: '#15803d',
                                                                                                border: '1px solid #bbf7d0',
                                                                                                borderRadius: '12px',
                                                                                                padding: '1px 7px',
                                                                                                fontSize: '11px',
                                                                                                fontWeight: 600,
                                                                                                lineHeight: '16px',
                                                                                                whiteSpace: 'nowrap'
                                                                                            }}
                                                                                        >
                                                                                            On Track
                                                                                        </span>
                                                                                    )}

                                                                                    <span
                                                                                        title="Week"
                                                                                        style={{
                                                                                            background: '#e0e7ff',
                                                                                            color: '#3730a3',
                                                                                            border: '1px solid #c7d2fe',
                                                                                            borderRadius: '12px',
                                                                                            padding: '1px 7px',
                                                                                            fontSize: '11px',
                                                                                            fontWeight: 600,
                                                                                            lineHeight: '16px',
                                                                                            whiteSpace: 'nowrap'
                                                                                        }}
                                                                                    >
                                                                                        W{displayWeek}
                                                                                    </span>
                                                                                    <span
                                                                                        title="Story Points"
                                                                                        style={{
                                                                                            background: '#f1f5f9',
                                                                                            color: '#475569',
                                                                                            border: '1px solid #e2e8f0',
                                                                                            borderRadius: '12px',
                                                                                            padding: '1px 7px',
                                                                                            fontSize: '11px',
                                                                                            fontWeight: 600,
                                                                                            lineHeight: '16px',
                                                                                            whiteSpace: 'nowrap'
                                                                                        }}
                                                                                    >
                                                                                        {taskPoints} pts
                                                                                    </span>
                                                                                </div>
                                                                            </div>

                                                                            <div
                                                                                className="task-card-bottom"
                                                                                style={{
                                                                                    display: 'flex',
                                                                                    justifyContent: 'space-between',
                                                                                    alignItems: 'center',
                                                                                    marginTop: 'auto',
                                                                                    paddingRight: showNotAcceptBtn ? '32px' : '0'
                                                                                }}
                                                                            >
                                                                                <div className="task-card-meta" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                                                                    <span className={`priority-tag priority-${task.priority?.toLowerCase()}`}>
                                                                                        {task.priority || 'Medium'}
                                                                                    </span>
                                                                                </div>

                                                                                {assignees.length > 0 && (
                                                                                    <div className="task-assignees-group" style={{ marginLeft: 'auto', display: 'flex', gap: '-4px' }}>
                                                                                        {assignees.map((assignee, aIdx) => {
                                                                                            const userInfo = getUserInfo(assignee, projectMembers);
                                                                                            const name = getMemberDisplayName(userInfo);
                                                                                            const assigneeId = typeof assignee === 'object'
                                                                                                ? (assignee._id || assignee.id || aIdx)
                                                                                                : assignee;

                                                                                            return (
                                                                                                <div
                                                                                                    key={assigneeId}
                                                                                                    className="task-assignee-avatar"
                                                                                                    title={name}
                                                                                                    style={{
                                                                                                        marginLeft: aIdx > 0 ? '-6px' : '0',
                                                                                                        border: '2px solid #ffffff',
                                                                                                        borderRadius: '50%'
                                                                                                    }}
                                                                                                >
                                                                                                    {getInitials(name)}
                                                                                                </div>
                                                                                            );
                                                                                        })}
                                                                                    </div>
                                                                                )}
                                                                            </div>

                                                                            {showNotAcceptBtn && (
                                                                                <button
                                                                                    type="button"
                                                                                    title="Not Accept Task"
                                                                                    onClick={(e) => handleLeaderDecisionOnTask(e, task, column._id, false)}
                                                                                    style={{
                                                                                        position: 'absolute',
                                                                                        right: '10px',
                                                                                        top: '50%',
                                                                                        transform: 'translateY(-50%)',
                                                                                        backgroundColor: '#dc2626',
                                                                                        color: '#ffffff',
                                                                                        border: 'none',
                                                                                        borderRadius: '50%',
                                                                                        width: '24px',
                                                                                        height: '24px',
                                                                                        cursor: 'pointer',
                                                                                        display: 'flex',
                                                                                        alignItems: 'center',
                                                                                        justifyContent: 'center',
                                                                                        transition: 'background-color 0.2s',
                                                                                        zIndex: 2
                                                                                    }}
                                                                                >
                                                                                    <X size={14} strokeWidth={3} />
                                                                                </button>
                                                                            )}
                                                                        </div>
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
                                                className="add-task-btn"
                                                style={{ width: '260px', cursor: 'pointer', marginTop: '4px' }}
                                                onClick={() => handleOpenCreateModal(column._id, true)}
                                            >
                                                + Add Task
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </DragDropContext>
                </main>
            </div>

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
                currentUserId={getCurrentUserId()}
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
        </div>
    );
}