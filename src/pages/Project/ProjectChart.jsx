// src/pages/ProjectChartPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import Header from './../../components/layout/Header/Header.jsx';
import Sidebar from './../../components/layout/Sidebar/Sidebar.jsx';
import { fetchProjectById, fetchTasksByProject, fetchMembersByProject, fetchColumnsByProject } from '../../../api.jsx';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import { Calendar, CalendarClock, LayoutGrid, List, Settings, UsersRound, ListChecks, Info, BarChart2, Loader2, AlertCircle } from "lucide-react";
import "./project.css";

const formatDateDMY = (dateValue) => {
    if (!dateValue) return 'Not set';
    const d = new Date(dateValue);
    if (isNaN(d.getTime())) return 'Not set';
    return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

// Hàm tính số ngày bị trì trệ từ mốc thời gian cập nhật/chuyển status mới nhất đến ngày hiện tại
const calculateDaysStuck = (dateValue) => {
    if (!dateValue) return 0;
    const lastDate = new Date(dateValue);
    if (isNaN(lastDate.getTime())) return 0;

    const today = new Date();

    // Đặt về mốc 0h:00m:00s để tính chính xác chênh lệch theo ngày
    const t1 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const t2 = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate());

    const diffTime = Math.abs(t1 - t2);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
};

export default function ProjectChartPage() {
    const { id: activeProjectId } = useParams();

    // Project Info States
    const [project, setProject] = useState(null);
    const [projectMembers, setProjectMembers] = useState([]);
    const [tasks, setTasks] = useState([]);

    // Loading & Error States
    const [loadingPage, setLoadingPage] = useState(true);
    const [loadingChart, setLoadingChart] = useState(true);
    const [errorMsg, setErrorMsg] = useState('');

    // Chart Data States
    const [statusChartData, setStatusChartData] = useState([]); // Chart 1: Status
    const [weekChartData, setWeekChartData] = useState([]);     // Chart 2: Week

    // Tables Data State (Stagnant Tasks for To Do, In Progress, Review)
    const [stagnantTables, setStagnantTables] = useState({
        todo: [],
        inProgress: [],
        review: []
    });

    useEffect(() => {
        if (!activeProjectId) return;

        // 1. Fetch Project Header Info
        const loadProjectInfo = async () => {
            try {
                setLoadingPage(true);
                const [pData, tData, mData] = await Promise.all([
                    fetchProjectById(activeProjectId).catch(() => null),
                    fetchTasksByProject(activeProjectId).catch(() => []),
                    fetchMembersByProject(activeProjectId).catch(() => [])
                ]);

                setProject(pData?.data || pData);
                setTasks(Array.isArray(tData) ? tData : (tData?.data || []));
                setProjectMembers(Array.isArray(mData) ? mData : (mData?.data || []));
            } catch (err) {
                console.error("Error loading project info:", err);
            } finally {
                setLoadingPage(false);
            }
        };

        // 2. Fetch and Process Chart & Table Data
        const loadChartData = async () => {
            try {
                setLoadingChart(true);
                setErrorMsg('');

                const [tasksRes, columnsRes] = await Promise.all([
                    fetchTasksByProject(activeProjectId).catch(() => []),
                    fetchColumnsByProject(activeProjectId).catch(() => [])
                ]);

                const tasksList = Array.isArray(tasksRes) ? tasksRes : (tasksRes?.data || []);
                const columnsList = Array.isArray(columnsRes) ? columnsRes : (columnsRes?.data || []);

                const colPositionMap = new Map();
                columnsList.forEach(col => {
                    const id = String(col._id || col.id);
                    colPositionMap.set(id, col.position);
                });

                // --- 1. CHART DATA: Task Count by Status ---
                const counts = { backlog: 0, todo: 0, inProgress: 0, review: 0, done: 0 };

                // --- 3 TABLES DATA: Stagnant Tasks ---
                const todoList = [];
                const inProgressList = [];
                const reviewList = [];

                tasksList.forEach(task => {
                    let colId = null;
                    if (task.columnId) {
                        colId = typeof task.columnId === 'object'
                            ? String(task.columnId._id || task.columnId.id || '')
                            : String(task.columnId);
                    }

                    const pos = colPositionMap.get(colId);

                    // Sử dụng updatedAt để reset ngày khi chuyển cột/status. Nếu chưa có updatedAt thì fallback về createdAt
                    const lastUpdatedDate = task.updatedAt || task.createdAt;
                    const days = calculateDaysStuck(lastUpdatedDate);

                    const taskItem = {
                        id: task._id || task.id,
                        title: task.title || 'Untitled Task',
                        days: days
                    };

                    if (!colId) {
                        counts.backlog++;
                    } else if (pos === 0) {
                        counts.todo++;
                        todoList.push(taskItem);
                    } else if (pos === 1) {
                        counts.inProgress++;
                        inProgressList.push(taskItem);
                    } else if (pos === 2) {
                        counts.review++;
                        reviewList.push(taskItem);
                    } else if (pos === 3) {
                        counts.done++;
                    } else {
                        counts.backlog++;
                    }
                });

                const formattedStatusData = [
                    { name: 'Backlog', tasks: counts.backlog, color: '#ef4444' },     // Red
                    { name: 'To Do', tasks: counts.todo, color: '#3b82f6' },         // Blue
                    { name: 'In Progress', tasks: counts.inProgress, color: '#22c55e' }, // Green
                    { name: 'Review', tasks: counts.review, color: '#06b6d4' },       // Cyan
                    { name: 'Done', tasks: counts.done, color: '#a855f7' }            // Purple
                ];

                setStatusChartData(formattedStatusData);

                // --- 2. CHART DATA: Task Count by Week ---
                const weekMap = {};
                tasksList.forEach(task => {
                    const w = task.week || 1; // Mặc định là tuần 1
                    weekMap[w] = (weekMap[w] || 0) + 1;
                });

                const formattedWeekData = Object.keys(weekMap)
                    .sort((a, b) => Number(a) - Number(b))
                    .map(w => ({
                        weekLabel: `Week ${w}`,
                        weekNum: w,
                        tasks: weekMap[w]
                    }));

                setWeekChartData(formattedWeekData);

                // Lưu dữ liệu 3 bảng trì trệ
                setStagnantTables({
                    todo: todoList,
                    inProgress: inProgressList,
                    review: reviewList
                });

            } catch (err) {
                console.error("Error loading chart data:", err);
                setErrorMsg("Failed to load chart data.");
            } finally {
                setLoadingChart(false);
            }
        };

        loadProjectInfo();
        loadChartData();
    }, [activeProjectId]);

    // Helper render từng bảng trạng thái
    const renderStagnantTable = (title, dataList, headerBgColor) => (
        <div style={{
            flex: '1 1 300px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Table Header Title */}
            <div style={{
                backgroundColor: headerBgColor,
                color: '#ffffff',
                padding: '12px 16px',
                textAlign: 'center',
                fontWeight: '600',
                fontSize: '16px'
            }}>
                {title}
            </div>

            {/* Table Content */}
            <div style={{ overflowX: 'auto', flex: 1 }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px', textAlign: 'left' }}>
                    <thead>
                    <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '10px 14px', color: '#4b5563', fontWeight: '600' }}>Tasks</th>
                        <th style={{ padding: '10px 14px', color: '#4b5563', fontWeight: '600', width: '80px', textAlign: 'center' }}>Days</th>
                    </tr>
                    </thead>
                    <tbody>
                    {dataList.length === 0 ? (
                        <tr>
                            <td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: '#9ca3af', fontSize: '13px' }}>
                                No tasks
                            </td>
                        </tr>
                    ) : (
                        dataList.map((item, idx) => (
                            <tr key={item.id || idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                                <td style={{
                                    padding: '10px 14px',
                                    color: '#1f2937',
                                    maxWidth: '200px',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis'
                                }} title={item.title}>
                                    {item.title}
                                </td>
                                <td style={{
                                    padding: '10px 14px',
                                    textAlign: 'center',
                                    fontWeight: '600',
                                    color: item.days > 7 ? '#ef4444' : '#374151'
                                }}>
                                    {item.days} d
                                </td>
                            </tr>
                        ))
                    )}
                    </tbody>
                </table>
            </div>
        </div>
    );

    return (
        <div className="app-shell">
            <Sidebar />
            <div className="app-main">
                <Header />

                {/* Project Header */}
                <div className="project-header">
                    <div className="project-header-top">
                        {loadingPage ? (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#6b7280', padding: '12px 0' }}>
                                <Loader2 className="animate-spin" size={20} style={{ color: '#4f46e5' }} />
                                <span>Loading...</span>
                            </div>
                        ) : (
                            <div>
                                <div className="project-title-row">
                                    <span className="project-color-dot" style={{ background: project?.color || '#4f46e5' }}></span>
                                    <h1>{project?.name || 'Project'}</h1>
                                </div>
                                <p className="page-subtitle">{project?.description || 'No description'}</p>
                                <div className="project-meta-row">
                                    <span className="project-meta-item"><UsersRound className="icon icon-sm" />{projectMembers.length} members</span>
                                    <span className="project-meta-item"><ListChecks className="icon icon-sm" />{tasks.length} tasks</span>
                                    <span className="project-meta-item"><Calendar className="icon icon-sm" />Start Date: {formatDateDMY(project?.startDate || project?.createdAt)}</span>
                                    <span className="project-meta-item"><CalendarClock className="icon icon-sm" />End Date: {formatDateDMY(project?.date || project?.endDate)}</span>
                                </div>
                            </div>
                        )}

                        <Link to={`/projectsetting/${activeProjectId}`} className="icon-btn icon-btn-outline">
                            <Settings className="icon" />
                        </Link>
                    </div>

                    {/* Navigation Tabs */}
                    <nav className="project-tabs">
                        <Link to={`/projectoverview/${activeProjectId}`} className="project-tab">
                            <Info className="icon icon-sm" /> Overview
                        </Link>
                        <Link to={`/projectchart/${activeProjectId}`} className="project-tab active">
                            <BarChart2 className="icon icon-sm" /> Chart
                        </Link>
                        <Link to={`/projectboard/${activeProjectId}`} className="project-tab">
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

                {/* Main Content Area */}
                <main className="page-content" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {loadingChart ? (
                        <div style={{
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'center',
                            alignItems: 'center',
                            height: '350px',
                            gap: '12px',
                            color: '#4f46e5',
                            backgroundColor: '#ffffff',
                            borderRadius: '12px',
                            padding: '24px'
                        }}>
                            <Loader2 className="animate-spin" size={36} />
                            <span style={{ fontWeight: 500, color: '#4b5563', fontSize: '15px' }}>
                                Loading...
                            </span>
                        </div>
                    ) : errorMsg ? (
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            color: '#ef4444',
                            height: '200px',
                            backgroundColor: '#fef2f2',
                            borderRadius: '8px'
                        }}>
                            <AlertCircle size={20} />
                            <span>{errorMsg}</span>
                        </div>
                    ) : (
                        <>
                            {/* SECTION 1: 2 Biểu đồ cột nằm trên 1 hàng */}
                            <div style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(420px, 1fr))',
                                gap: '24px',
                                width: '100%'
                            }}>
                                {/* CHART 1: Task Count by Status */}
                                <div style={{
                                    backgroundColor: '#ffffff',
                                    padding: '24px',
                                    borderRadius: '12px',
                                    border: '1px solid #e5e7eb',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    <h2 style={{
                                        textAlign: 'center',
                                        marginBottom: '20px',
                                        fontSize: '17px',
                                        fontWeight: '600',
                                        color: '#1f2937'
                                    }}>
                                        Task Count by Status
                                    </h2>

                                    <div style={{ width: '100%', height: 320 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={statusChartData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                <XAxis
                                                    dataKey="name"
                                                    label={{ value: 'Status', position: 'insideBottom', offset: -10, style: { fontWeight: 600, fill: '#4b5563', fontSize: '13px' } }}
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <YAxis
                                                    allowDecimals={false}
                                                    label={{ value: 'Tasks', angle: -90, position: 'insideLeft', style: { fontWeight: 600, fill: '#4b5563', fontSize: '13px' } }}
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <Tooltip
                                                    formatter={(value) => [`${value} tasks`, 'Task Count']}
                                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                                />
                                                <Legend verticalAlign="top" height={36} />
                                                <Bar dataKey="tasks" name="Task Count" barSize={36} radius={[6, 6, 0, 0]}>
                                                    {statusChartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>

                                {/* CHART 2: Task Count by Week */}
                                <div style={{
                                    backgroundColor: '#ffffff',
                                    padding: '24px',
                                    borderRadius: '12px',
                                    border: '1px solid #e5e7eb',
                                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
                                    display: 'flex',
                                    flexDirection: 'column'
                                }}>
                                    <h2 style={{
                                        textAlign: 'center',
                                        marginBottom: '20px',
                                        fontSize: '17px',
                                        fontWeight: '600',
                                        color: '#1f2937'
                                    }}>
                                        Task Count by Week
                                    </h2>

                                    <div style={{ width: '100%', height: 320 }}>
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={weekChartData} margin={{ top: 20, right: 20, left: -10, bottom: 20 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                                <XAxis
                                                    dataKey="weekLabel"
                                                    label={{ value: 'Week', position: 'insideBottom', offset: -10, style: { fontWeight: 600, fill: '#4b5563', fontSize: '13px' } }}
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <YAxis
                                                    allowDecimals={false}
                                                    label={{ value: 'Tasks', angle: -90, position: 'insideLeft', style: { fontWeight: 600, fill: '#4b5563', fontSize: '13px' } }}
                                                    tick={{ fontSize: 12 }}
                                                />
                                                <Tooltip
                                                    formatter={(value) => [`${value} tasks`, 'Task Count']}
                                                    contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb' }}
                                                />
                                                <Legend verticalAlign="top" height={36} />
                                                <Bar dataKey="tasks" name="Task Count" fill="#4f46e5" barSize={36} radius={[6, 6, 0, 0]} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 2: 3 Bảng trì trệ nằm trên 1 hàng */}
                            <div>
                                <h2 style={{
                                    textAlign: 'center',
                                    marginBottom: '20px',
                                    fontSize: '18px',
                                    fontWeight: '600',
                                    color: '#1f2937'
                                }}>
                                    Task Stagnation Days in Status
                                </h2>

                                <div style={{
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: '20px',
                                    justifyContent: 'space-between'
                                }}>
                                    {renderStagnantTable('To Do', stagnantTables.todo, '#3b82f6')}
                                    {renderStagnantTable('In Progress', stagnantTables.inProgress, '#22c55e')}
                                    {renderStagnantTable('Review', stagnantTables.review, '#06b6d4')}
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}