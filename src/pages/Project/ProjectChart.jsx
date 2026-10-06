// src/pages/ProjectChartPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchProjectById, fetchTasksByProject, fetchMembersByProject, fetchColumnsByProject } from '../../../api.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { withFallback, failureMessage } from '../../utils/requestState.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell, ResponsiveContainer } from 'recharts';
import { Loader2, AlertCircle } from "lucide-react";
import "./project.css";

import ProjectHeader from '../../components/project/ProjectHeader.jsx';

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
    // Requests that failed in the last load (header info / chart data); bump reloadKey to retry
    const [infoFailures, setInfoFailures] = useState([]);
    const [chartFailures, setChartFailures] = useState([]);
    const [reloadKey, setReloadKey] = useState(0);

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
            const failures = [];
            try {
                setLoadingPage(true);
                const [pData, tData, mData] = await Promise.all([
                    withFallback(fetchProjectById(activeProjectId), null, failures, 'project'),
                    withFallback(fetchTasksByProject(activeProjectId), [], failures, 'tasks'),
                    withFallback(fetchMembersByProject(activeProjectId), [], failures, 'members')
                ]);

                setProject(pData?.data || pData);
                setTasks(Array.isArray(tData) ? tData : (tData?.data || []));
                setProjectMembers(Array.isArray(mData) ? mData : (mData?.data || []));
            } catch (err) {
                console.error("Error loading project info:", err);
                failures.push({ label: 'info', error: err });
            } finally {
                setInfoFailures(failures);
                setLoadingPage(false);
            }
        };

        // 2. Fetch and Process Chart & Table Data
        const loadChartData = async () => {
            const failures = [];
            try {
                setLoadingChart(true);
                setErrorMsg('');

                const [tasksRes, columnsRes] = await Promise.all([
                    withFallback(fetchTasksByProject(activeProjectId), [], failures, 'chart-tasks'),
                    withFallback(fetchColumnsByProject(activeProjectId), [], failures, 'chart-columns')
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
                setChartFailures(failures);
                setLoadingChart(false);
            }
        };

        loadProjectInfo();
        loadChartData();
    }, [activeProjectId, reloadKey]);

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

    // Charts built from failed requests would show fake zeros — show the error instead
    const loadFailures = [...infoFailures, ...chartFailures];
    const coreFailure = loadFailures.find((f) => f.label !== 'members');
    const membersFailed = loadFailures.some((f) => f.label === 'members');
    if (!loadingPage && !loadingChart && coreFailure) {
        return (
            <main className="page-content">
                <ErrorState
                    title="Couldn't load project charts"
                    message={failureMessage(coreFailure)}
                    onRetry={() => setReloadKey((k) => k + 1)}
                />
            </main>
        );
    }

    return (
        <>

                <ProjectHeader
                    projectId={activeProjectId}
                    project={project}
                    memberCount={projectMembers.length}
                    taskCount={tasks.length}
                    startDate={formatDateDMY(project?.startDate || project?.createdAt)}
                    endDate={formatDateDMY(project?.date || project?.endDate)}
                    loading={loadingPage}
                />

                {/* Main Content Area */}
                <main className="page-content" style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '32px' }}>
                    {membersFailed && (
                        <ErrorState
                            variant="inline"
                            title="Project members could not be loaded."
                            message="The member count may be wrong."
                            onRetry={() => setReloadKey((k) => k + 1)}
                        />
                    )}
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
        </>
    );
}