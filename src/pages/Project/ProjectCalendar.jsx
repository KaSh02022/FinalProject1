import React, { useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import ErrorState from '../../components/common/ErrorState.jsx';
import { useConfirm, deleteConfirm } from '../../components/common/confirmContext.js';
import Modal from '../../components/common/Modal.jsx';
import { withFallback, failureMessage } from '../../utils/requestState.js';

import {
    Calendar as CalendarIcon,
    Plus,
    Loader2,
    ChevronLeft,
    ChevronRight,
    Trash2,
    StickyNote } from 'lucide-react';

import {
    fetchProjectById,
    fetchTasksByProject,
    fetchMembersByProject,
    createTask,
    deleteTask,
    fetchNotesByProject,
    createNote,
    deleteNote
} from '../../../api.jsx';
import { API_BASE_URL } from "../../config/apiConfig.js";

import ProjectHeader from '../../components/project/ProjectHeader.jsx';

// English month names list
const MONTH_NAMES = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

// Helper function to format Date into YYYY-MM-DD string based on Local Time
const formatDateToLocalString = (dateInput) => {
    if (!dateInput) return '';

    if (typeof dateInput === 'string') {
        const cleanStr = dateInput.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(cleanStr)) {
            return cleanStr;
        }
        if (cleanStr.includes('T')) {
            const parts = cleanStr.split('T');
            const datePart = parts[0];
            const timePart = parts[1];
            if (timePart.startsWith('00:00:00')) {
                return datePart;
            }
        }
    }

    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return '';

    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
};

// Helper function định dạng ngày dạng DD/MM/YYYY
const formatDateDMY = (dateValue) => {
    if (!dateValue) return 'Not set';
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return 'Not set';
    const day = String(d.getDate()).padStart(2, '0');
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
};

// Helper function to extract User ID from Member record
const extractUserId = (member) => {
    if (!member) return '';
    if (typeof member.userId === 'object') {
        return String(member.userId?._id || member.userId?.id || '');
    }
    if (member.userId) return String(member.userId);
    return String(member._id || member.id || '');
};

export default function ProjectCalendar() {
    const { id: projectId } = useParams();

    const [activeModal, setActiveModal] = useState(null);

    const [project, setProject] = useState({});
    const [projectMembers, setProjectMembers] = useState([]);
    const [memberCurrentRole, setMemberRole] = useState("");
    const [tasks, setTasks] = useState([]);
    const confirm = useConfirm();
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
    // Requests that failed in the last load (empty = everything loaded)
    const [loadFailures, setLoadFailures] = useState([]);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Month/Year display state for Calendar
    const [currentDate, setCurrentDate] = useState(new Date());

    // New Task creation state
    const [newTaskTitle, setNewTaskTitle] = useState('');
    const [newTaskPriority, setNewTaskPriority] = useState('Medium');
    const [newTaskPoints, setNewTaskPoints] = useState(0);
    const [newTaskDesc, setNewTaskDesc] = useState('');
    const [newTaskStartDate, setNewTaskStartDate] = useState('');
    const [newTaskDate, setNewTaskDate] = useState('');
    const [selectedMembers, setSelectedMembers] = useState([]);

    // State cho Note
    const [selectedNoteDate, setSelectedNoteDate] = useState('');
    const [noteContent, setNoteContent] = useState('');
    const [isSubmittingNote, setIsSubmittingNote] = useState(false);

    const getCurrentUser = () => {
        try {
            return JSON.parse(localStorage.getItem('user') || '{}');
        } catch {
            return {};
        }
    };

    const currentUser = getCurrentUser();
    const currentUserId = currentUser._id || currentUser.id || null;

    // Fetch current user's role from API
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
            console.error("Failed to fetch current user role:", err);
        }
    };

    useEffect(() => {
        fetchCurrentMemberRole();
    }, []);

    // Find current user's member info in project
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

    // PHÂN QUYỀN QUẢN LÝ NOTE: Chỉ Admin, Manager, Leader mới có quyền tạo/xóa note
    const canManageNote = isAdmin || isLeader || isManager;

    const loadData = async () => {
        if (!projectId) return;
        const failures = [];
        try {
            setLoading(true);
            const [pData, tskList, membersData, notesData] = await Promise.all([
                withFallback(fetchProjectById(projectId), {}, failures, 'project'),
                withFallback(fetchTasksByProject(projectId), [], failures, 'tasks'),
                withFallback(fetchMembersByProject(projectId), [], failures, 'members'),
                fetchNotesByProject ? withFallback(fetchNotesByProject(projectId), [], failures, 'notes') : Promise.resolve([])
            ]);

            const realProject = pData?.data || pData || {};
            const realTasks = Array.isArray(tskList) ? tskList : (tskList?.data || []);
            const realMembers = Array.isArray(membersData)
                ? membersData
                : (membersData?.data || membersData?.members || []);
            const realNotes = Array.isArray(notesData) ? notesData : (notesData?.data || []);

            setProject(realProject);
            setTasks(realTasks);
            setProjectMembers(realMembers);
            setNotes(realNotes);
        } catch (err) {
            console.error('Error loading calendar data:', err);
            failures.push({ label: 'calendar', error: err });
        } finally {
            setLoadFailures(failures);
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [projectId]);

    const resetTaskForm = () => {
        setNewTaskTitle('');
        setNewTaskDesc('');
        setNewTaskPriority('Medium');
        setNewTaskPoints(0);
        setNewTaskStartDate('');
        setNewTaskDate('');
        setSelectedMembers(currentUserId ? [String(currentUserId)] : []);
    };

    const handleOpenCreateModal = (selectedDateStr = '') => {
        if (!canCreateTask) return;
        resetTaskForm();
        setNewTaskDate(selectedDateStr || formatDateToLocalString(new Date()));
        setActiveModal('quickCreateTaskModal');
    };

    const closeModal = () => {
        setActiveModal(null);
        resetTaskForm();
        setNoteContent('');
    };

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!canCreateTask || !newTaskTitle.trim()) return;

        try {
            setIsSubmitting(true);
            const cleanMembers = selectedMembers.filter(id => Boolean(id));
            const pointValue = Number(newTaskPoints) || 0;

            const payload = {
                title: newTaskTitle,
                description: newTaskDesc,
                projectId: projectId,
                priority: newTaskPriority,
                point: pointValue,
                points: pointValue,
                startDate: newTaskStartDate ? new Date(newTaskStartDate) : null,
                date: newTaskDate ? newTaskDate : formatDateToLocalString(new Date()),
                assignees: cleanMembers,
                members: cleanMembers
            };

            const response = await createTask(payload);
            const createdTask = response?.data || response;

            if (createdTask && (createdTask._id || createdTask.id)) {
                const newId = String(createdTask._id || createdTask.id);
                setTasks(prev => {
                    const exists = prev.some(t => String(t._id || t.id) === newId);
                    if (exists) return prev;
                    return [...prev, createdTask];
                });
                closeModal();
            } else {
                await loadData();
                closeModal();
            }
        } catch (error) {
            console.error('Error creating task:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteTask = async (taskId, e) => {
        e.stopPropagation();
        if (!isManager) return;

        await confirm(deleteConfirm({
            item: 'task',
            // same optimistic remove + reload on failure as before; the dialog also shows the error
            onConfirm: async () => {
                try {
                    setTasks(prev => prev.filter(t => String(t._id || t.id) !== String(taskId)));
                    await deleteTask(taskId);
                } catch (err) {
                    console.error('Error deleting task:', err);
                    loadData();
                    throw err;
                }
            },
        }));
    };

    // --- XỬ LÝ NOTE (KIỂM TRA QUYỀN canManageNote) ---
    const handleOpenNoteModal = (dateStr, e) => {
        e.stopPropagation(); // Ngăn mở modal tạo task của ô lịch gốc
        if (!canManageNote) return;
        setSelectedNoteDate(dateStr);
        setNoteContent('');
        setActiveModal('createNoteModal');
    };

    const handleCreateNoteSubmit = async (e) => {
        e.preventDefault();
        if (!canManageNote || !noteContent.trim() || !selectedNoteDate) return;

        try {
            setIsSubmittingNote(true);
            const res = await createNote({
                projectId,
                content: noteContent,
                date: selectedNoteDate
            });
            const createdNote = res?.data || res;

            if (createdNote && (createdNote._id || createdNote.id)) {
                setNotes(prev => [...prev, createdNote]);
            } else {
                await loadData();
            }
            setActiveModal(null);
            setNoteContent('');
        } catch (err) {
            console.error('Error creating note:', err);
        } finally {
            setIsSubmittingNote(false);
        }
    };

    const handleDeleteNote = async (noteId, e) => {
        e.stopPropagation();
        if (!canManageNote) return;

        await confirm(deleteConfirm({
            item: 'note',
            onConfirm: async () => {
                try {
                    setNotes(prev => prev.filter(n => String(n._id || n.id) !== String(noteId)));
                    await deleteNote(noteId);
                } catch (err) {
                    console.error('Error deleting note:', err);
                    loadData();
                    throw err;
                }
            },
        }));
    };

    // --- CALENDAR GRID COMPUTATION ---
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const handlePrevMonth = () => setCurrentDate(new Date(year, month - 1, 1));
    const handleNextMonth = () => setCurrentDate(new Date(year, month + 1, 1));
    const handleToday = () => setCurrentDate(new Date());

    const calendarGrid = useMemo(() => {
        const firstDayOfMonth = new Date(year, month, 1);
        const lastDayOfMonth = new Date(year, month + 1, 0);

        let startingDayOfWeek = firstDayOfMonth.getDay();
        startingDayOfWeek = startingDayOfWeek === 0 ? 6 : startingDayOfWeek - 1;

        const daysInMonth = lastDayOfMonth.getDate();
        const days = [];

        const prevMonthLastDay = new Date(year, month, 0).getDate();
        for (let i = startingDayOfWeek - 1; i >= 0; i--) {
            days.push({
                date: new Date(year, month - 1, prevMonthLastDay - i),
                isCurrentMonth: false
            });
        }

        for (let day = 1; day <= daysInMonth; day++) {
            days.push({
                date: new Date(year, month, day),
                isCurrentMonth: true
            });
        }

        const remainingCells = (42 - days.length) % 7;
        for (let i = 1; i <= remainingCells; i++) {
            days.push({
                date: new Date(year, month + 1, i),
                isCurrentMonth: false
            });
        }

        return days;
    }, [year, month]);

    // Group tasks by date
    const tasksByDate = useMemo(() => {
        const map = {};
        const seenIds = new Set();

        tasks.forEach(task => {
            const taskId = String(task._id || task.id);
            if (!taskId || seenIds.has(taskId)) return;
            seenIds.add(taskId);

            const rawDate = task.date || task.dueDate;
            if (rawDate) {
                const dateStr = formatDateToLocalString(rawDate);
                if (dateStr) {
                    if (!map[dateStr]) map[dateStr] = [];
                    map[dateStr].push(task);
                }
            }
        });
        return map;
    }, [tasks]);

    // Group notes by date
    const notesByDate = useMemo(() => {
        const map = {};
        const seenIds = new Set();

        notes.forEach(note => {
            const noteId = String(note._id || note.id);
            if (seenIds.has(noteId)) return;
            seenIds.add(noteId);

            if (note.date) {
                const dateStr = formatDateToLocalString(note.date);
                if (dateStr) {
                    if (!map[dateStr]) map[dateStr] = [];
                    map[dateStr].push(note);
                }
            }
        });
        return map;
    }, [notes]);

    // Định dạng hiển thị Start Date và End Date chuẩn DD/MM/YYYY
    const formattedStartDate = formatDateDMY(project?.startDate || project?.start_date || project?.createdAt);
    const formattedDueDate = formatDateDMY(project?.date || project?.dueDate || project?.endDate);

    // Core data missing → show the error instead of placeholder values; other failures → inline notice
    const CORE_LOADS = ['project', 'tasks', 'calendar'];
    const coreFailure = loadFailures.find((f) => CORE_LOADS.includes(f.label));
    const partialFailure = !coreFailure && loadFailures.length > 0;

    return (
        <>

                {loading ? (
                    <div className="page-loading" role="status">
                        <Loader2 className="icon animate-spin" aria-hidden="true" />
                        <span>Loading...</span>
                    </div>
                ) : coreFailure ? (
                    <main className="page-content">
                        <ErrorState
                            title="Couldn't load the project calendar"
                            message={failureMessage(coreFailure)}
                            onRetry={loadData}
                        />
                    </main>
                ) : (
                    <>
                        <ProjectHeader
                            projectId={projectId}
                            project={project}
                            memberCount={projectMembers.length}
                            taskCount={tasks.length}
                            startDate={formattedStartDate}
                            endDate={formattedDueDate}
                        />

                        {/* Main Content: Calendar */}
                        <main className="page-content">
                            {partialFailure && (
                                <ErrorState
                                    variant="inline"
                                    title="Some project data could not be loaded."
                                    message="Members or notes may be missing."
                                    onRetry={loadData}
                                />
                            )}
                            {/* Navigation Toolbar */}
                            <div className="calendar-toolbar">
                                <h2 className="calendar-month">
                                    {`${MONTH_NAMES[month]} ${year}`}
                                </h2>

                                <div className="calendar-toolbar-actions">
                                    <button type="button" onClick={handlePrevMonth} className="btn btn-secondary btn-sm btn-icon-sm" aria-label="Previous month">
                                        <ChevronLeft className="icon icon-sm" aria-hidden="true" />
                                    </button>
                                    <button type="button" onClick={handleToday} className="btn btn-secondary btn-sm">
                                        Month
                                    </button>
                                    <button type="button" onClick={handleNextMonth} className="btn btn-secondary btn-sm btn-icon-sm" aria-label="Next month">
                                        <ChevronRight className="icon icon-sm" aria-hidden="true" />
                                    </button>
                                </div>
                            </div>

                            {/* Calendar Grid */}
                            <div className="calendar-card">
                                <div className="calendar-weekdays">
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName) => (
                                        <div key={dayName}>{dayName}</div>
                                    ))}
                                </div>

                                <div className="calendar-days">
                                    {calendarGrid.map((cell, idx) => {
                                        const dateStr = formatDateToLocalString(cell.date);
                                        const dayTasks = tasksByDate[dateStr] || [];
                                        const dayNotes = notesByDate[dateStr] || [];
                                        const todayStr = formatDateToLocalString(new Date());
                                        const isToday = todayStr === dateStr;

                                        return (
                                            <div
                                                key={idx}
                                                onClick={() => canCreateTask && handleOpenCreateModal(dateStr)}
                                                className={`calendar-cell${cell.isCurrentMonth ? '' : ' is-outside'}`}
                                            >
                                                <div className="calendar-cell-head">
                                                    <span className={`calendar-day-num${isToday ? ' is-today' : ''}`} aria-current={isToday ? 'date' : undefined}>
                                                        {cell.date.getDate()}
                                                    </span>

                                                    {/* NÚT DẤU CỘNG (+) TẠO NOTE: Chỉ hiển thị cho Admin, Leader, Manager */}
                                                    {canManageNote && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleOpenNoteModal(dateStr, e)}
                                                            title="Add note"
                                                            aria-label={`Add note on ${dateStr}`}
                                                            className="calendar-add-note"
                                                        >
                                                            <Plus size={13} aria-hidden="true" />
                                                        </button>
                                                    )}
                                                </div>

                                                <div className="calendar-cell-items">
                                                    {/* HIỂN THỊ NOTES NẾU CÓ */}
                                                    {dayNotes.map(note => {
                                                        const noteId = note._id || note.id;
                                                        return (
                                                            <div
                                                                key={noteId}
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{
                                                                    fontSize: '11px',
                                                                    padding: '3px 6px',
                                                                    borderRadius: '4px',
                                                                    background: '#fef3c7',
                                                                    borderLeft: '3px solid #f59e0b',
                                                                    color: '#92400e',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: '4px'
                                                                }}
                                                            >
                                                                <span
                                                                    title={note.content}
                                                                    style={{
                                                                        whiteSpace: 'nowrap',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        fontWeight: 500,
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '3px'
                                                                    }}
                                                                >
                                                                    <StickyNote size={10} style={{ flexShrink: 0 }} />
                                                                    {note.content}
                                                                </span>

                                                                {/* NÚT XÓA NOTE: Chỉ hiển thị cho Admin, Leader, Manager */}
                                                                {canManageNote && (
                                                                    <button
                                                                        type="button"
                                                                        className="calendar-delete-btn"
                                                                        aria-label="Delete note"
                                                                        title="Delete note"
                                                                        onClick={(e) => handleDeleteNote(noteId, e)}
                                                                    >
                                                                        <Trash2 size={11} aria-hidden="true" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}

                                                    {/* HIỂN THỊ TASKS GỐC */}
                                                    {dayTasks.map(task => {
                                                        const taskId = task._id || task.id;
                                                        return (
                                                            <div
                                                                key={taskId}
                                                                onClick={(e) => e.stopPropagation()}
                                                                style={{
                                                                    fontSize: '12px',
                                                                    padding: '4px 6px',
                                                                    borderRadius: '4px',
                                                                    background: '#f1f5f9',
                                                                    borderLeft: '3px solid #4f46e5',
                                                                    display: 'flex',
                                                                    alignItems: 'center',
                                                                    justifyContent: 'space-between',
                                                                    gap: '4px'
                                                                }}
                                                            >
                                                                <span
                                                                    title={task.title}
                                                                    style={{
                                                                        whiteSpace: 'nowrap',
                                                                        overflow: 'hidden',
                                                                        textOverflow: 'ellipsis',
                                                                        fontWeight: 500,
                                                                        color: '#334155'
                                                                    }}
                                                                >
                                                                    {task.title || 'Untitled'}
                                                                </span>
                                                                {isManager && (
                                                                    <button
                                                                        type="button"
                                                                        className="calendar-delete-btn"
                                                                        aria-label={`Delete task ${task.title || 'Untitled'}`}
                                                                        title="Delete task"
                                                                        onClick={(e) => handleDeleteTask(taskId, e)}
                                                                    >
                                                                        <Trash2 size={12} aria-hidden="true" />
                                                                    </button>
                                                                )}
                                                            </div>
                                                        );
                                                    })}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        </main>

                        {/* MODAL TẠO NOTE KHI BẤM DẤU CỘNG */}
                        {canManageNote && activeModal === 'createNoteModal' && (
                            <Modal title={`Add note (${selectedNoteDate})`} size="sm" onClose={() => setActiveModal(null)}>
                                <form className="modal-form" onSubmit={handleCreateNoteSubmit}>
                                    <div className="modal-body">
                                        <textarea
                                            className="textarea note-textarea"
                                            aria-label="Note content"
                                            value={noteContent}
                                            onChange={(e) => setNoteContent(e.target.value)}
                                            placeholder="Write a note…"
                                            rows={3}
                                            required
                                        />
                                    </div>
                                    <div className="modal-footer">
                                        <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary btn-sm">
                                            Cancel
                                        </button>
                                        <button type="submit" disabled={isSubmittingNote} className="btn btn-primary btn-sm">
                                            {isSubmittingNote ? <Loader2 className="animate-spin" size={14} aria-label="Saving" /> : 'Save note'}
                                        </button>
                                    </div>
                                </form>
                            </Modal>
                        )}
                    </>
                )}
        </>
    );
}