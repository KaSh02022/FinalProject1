import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from './../../components/layout/Header/Header.jsx';
import Sidebar from './../../components/layout/Sidebar/Sidebar.jsx';

import {
    LayoutGrid,
    List,
    Calendar as CalendarIcon,
    Settings,
    Plus,
    Loader2,
    UsersRound,
    ListChecks,
    CalendarClock,
    ChevronLeft,
    ChevronRight,
    Trash2,
    Calendar,
    StickyNote,
    X, Info, BarChart2,
} from 'lucide-react';

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

    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [sidebarMobileOpen, setSidebarMobileOpen] = useState(false);
    const [activeModal, setActiveModal] = useState(null);

    const [project, setProject] = useState({});
    const [projectMembers, setProjectMembers] = useState([]);
    const [memberCurrentRole, setMemberRole] = useState("");
    const [tasks, setTasks] = useState([]);
    const [notes, setNotes] = useState([]);
    const [loading, setLoading] = useState(true);
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

            const res = await fetch("http://localhost:3000/api/user/currentUser", {
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
        try {
            setLoading(true);
            const [pData, tskList, membersData, notesData] = await Promise.all([
                fetchProjectById(projectId).catch(() => ({})),
                fetchTasksByProject(projectId).catch(() => []),
                fetchMembersByProject(projectId).catch(() => []),
                fetchNotesByProject ? fetchNotesByProject(projectId).catch(() => []) : Promise.resolve([])
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
        } finally {
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
        if (!window.confirm('Are you sure you want to delete this task?')) return;

        try {
            setTasks(prev => prev.filter(t => String(t._id || t.id) !== String(taskId)));
            await deleteTask(taskId);
        } catch (err) {
            console.error('Error deleting task:', err);
            loadData();
        }
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
        if (!window.confirm('Are you sure you want to delete this note?')) return;
        try {
            setNotes(prev => prev.filter(n => String(n._id || n.id) !== String(noteId)));
            await deleteNote(noteId);
        } catch (err) {
            console.error('Error deleting note:', err);
            loadData();
        }
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
                        {/* Project Header */}
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
                                <Link to={`/projectlist/${projectId}`} className="project-tab ">
                                    <List className="icon icon-sm" /> Backlog
                                </Link>
                                <Link to={`/projectcalendar/${projectId}`} className="project-tab active">
                                    <Calendar className="icon icon-sm" /> Calendar
                                </Link>
                            </nav>
                        </div>

                        {/* Main Content: Calendar */}
                        <main className="page-content" style={{ padding: '20px' }}>
                            {/* Navigation Toolbar */}
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h2 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a' }}>
                                    {`${MONTH_NAMES[month]} ${year}`}
                                </h2>

                                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button onClick={handlePrevMonth} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
                                            <ChevronLeft className="w-4 h-4" />
                                        </button>
                                        <button onClick={handleToday} className="btn btn-secondary btn-sm" style={{ padding: '4px 10px', fontSize: '13px' }}>
                                            Month
                                        </button>
                                        <button onClick={handleNextMonth} className="btn btn-secondary btn-sm" style={{ padding: '6px' }}>
                                            <ChevronRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Calendar Grid */}
                            <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', textAlign: 'center', fontWeight: 600, fontSize: '13px', color: '#64748b' }}>
                                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((dayName) => (
                                        <div key={dayName} style={{ padding: '10px 0' }}>{dayName}</div>
                                    ))}
                                </div>

                                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gridAutoRows: 'minmax(120px, auto)', gap: '1px', background: '#e2e8f0' }}>
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
                                                style={{
                                                    background: cell.isCurrentMonth ? '#fff' : '#f8fafc',
                                                    padding: '8px',
                                                    display: 'flex',
                                                    flexDirection: 'column',
                                                    gap: '4px',
                                                    cursor: canCreateTask ? 'pointer' : 'default',
                                                    position: 'relative'
                                                }}
                                            >
                                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                                                    <span style={{
                                                        fontSize: '12px',
                                                        fontWeight: isToday ? 700 : 500,
                                                        color: isToday ? '#fff' : (cell.isCurrentMonth ? '#1e293b' : '#94a3b8'),
                                                        background: isToday ? '#4f46e5' : 'transparent',
                                                        borderRadius: '50%',
                                                        width: '22px',
                                                        height: '22px',
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        justifyContent: 'center'
                                                    }}>
                                                        {cell.date.getDate()}
                                                    </span>

                                                    {/* NÚT DẤU CỘNG (+) TẠO NOTE: Chỉ hiển thị cho Admin, Leader, Manager */}
                                                    {canManageNote && (
                                                        <button
                                                            type="button"
                                                            onClick={(e) => handleOpenNoteModal(dateStr, e)}
                                                            title="Add note"
                                                            style={{
                                                                border: 'none',
                                                                background: '#e0e7ff',
                                                                color: '#4f46e5',
                                                                borderRadius: '4px',
                                                                width: '20px',
                                                                height: '20px',
                                                                cursor: 'pointer',
                                                                display: 'inline-flex',
                                                                alignItems: 'center',
                                                                justifyContent: 'center',
                                                                padding: 0
                                                            }}
                                                        >
                                                            <Plus size={13} />
                                                        </button>
                                                    )}
                                                </div>

                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', overflowY: 'auto', maxHeight: '90px' }}>
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
                                                                    <Trash2
                                                                        size={11}
                                                                        style={{ cursor: 'pointer', flexShrink: 0, opacity: 0.8 }}
                                                                        onClick={(e) => handleDeleteNote(noteId, e)}
                                                                    />
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
                                                                    <Trash2
                                                                        size={12}
                                                                        style={{ cursor: 'pointer', color: '#94a3b8' }}
                                                                        onClick={(e) => handleDeleteTask(taskId, e)}
                                                                    />
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
                            <div style={{
                                position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                                background: 'rgba(15, 23, 42, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000
                            }}>
                                <div style={{ background: '#fff', borderRadius: '8px', padding: '20px', width: '380px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                                        <h3 style={{ fontSize: '15px', fontWeight: 600, color: '#0f172a' }}>Add note ({selectedNoteDate})</h3>
                                        <button onClick={() => setActiveModal(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                                            <X size={18} />
                                        </button>
                                    </div>
                                    <form onSubmit={handleCreateNoteSubmit}>
                                        <textarea
                                            value={noteContent}
                                            onChange={(e) => setNoteContent(e.target.value)}
                                            placeholder="Nhập nội dung ghi chú..."
                                            rows={3}
                                            required
                                            autoFocus
                                            style={{
                                                width: '100%',
                                                padding: '8px 12px',
                                                borderRadius: '6px',
                                                border: '1px solid #cbd5e1',
                                                outline: 'none',
                                                resize: 'none',
                                                fontSize: '14px',
                                                boxSizing: 'border-box'
                                            }}
                                        />
                                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '14px' }}>
                                            <button type="button" onClick={() => setActiveModal(null)} className="btn btn-secondary btn-sm" style={{ padding: '6px 12px', fontSize: '13px' }}>
                                                Hủy
                                            </button>
                                            <button type="submit" disabled={isSubmittingNote} className="btn btn-primary btn-sm" style={{ background: '#4f46e5', color: '#fff', padding: '6px 14px', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '13px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                                                {isSubmittingNote ? <Loader2 className="animate-spin" size={14} /> : 'Lưu ghi chú'}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}