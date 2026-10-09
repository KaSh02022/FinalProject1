// src/pages/ProjectChartPage.jsx
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { fetchProjectById, fetchTasksByProject, fetchMembersByProject, fetchColumnsByProject } from '../../../api.jsx';
import ErrorState from '../../components/common/ErrorState.jsx';
import { withFallback, failureMessage } from '../../utils/requestState.js';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell, ResponsiveContainer } from 'recharts';
import { AlertCircle, BarChart3, CalendarRange, Hourglass } from "lucide-react";
import { ChartCard, LoadingBlock } from '../Dashboard/analytics/chartKit.jsx';
import { CHART_COLORS, AXIS_TICK } from '../Dashboard/analytics/chartTheme.js';
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

                // same colours as the board column accents (--status-* tokens), so a status reads the same everywhere
                const formattedStatusData = [
                    { name: 'Backlog', tasks: counts.backlog, color: '#94a3b8' },
                    { name: 'To Do', tasks: counts.todo, color: '#64748b' },
                    { name: 'In Progress', tasks: counts.inProgress, color: '#f59e0b' },
                    { name: 'Review', tasks: counts.review, color: '#6366f1' },
                    { name: 'Done', tasks: counts.done, color: '#16a34a' }
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

    // One "time in status" table per column (days since the task was last updated)
    const renderStagnantTable = (title, dataList, kind) => (
        <section className={`card stagnation-card kind-${kind}`} aria-label={`${title}: days in status`}>
            <header className="stagnation-card-header">
                <h3 className="stagnation-card-title">{title}</h3>
                <span className="board-column-count">{dataList.length}</span>
            </header>
            <div className="stagnation-card-body">
                <table className="stagnation-table">
                    <thead>
                        <tr>
                            <th scope="col">Task</th>
                            <th scope="col" className="is-numeric">Days</th>
                        </tr>
                    </thead>
                    <tbody>
                        {dataList.length === 0 ? (
                            <tr>
                                <td colSpan={2} className="stagnation-empty">No tasks in this status</td>
                            </tr>
                        ) : (
                            dataList.map((item, idx) => (
                                <tr key={item.id || idx}>
                                    <td className="stagnation-task" title={item.title}>{item.title}</td>
                                    <td className={`is-numeric stagnation-days${item.days > 7 ? ' is-stale' : ''}`}>
                                        {item.days} d
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </section>
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

    const totalTasks = statusChartData.reduce((sum, d) => sum + d.tasks, 0);

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

                <main className="page-content project-charts-page">
                    {membersFailed && (
                        <ErrorState
                            variant="inline"
                            title="Project members could not be loaded."
                            message="The member count may be wrong."
                            onRetry={() => setReloadKey((k) => k + 1)}
                        />
                    )}
                    {loadingChart ? (
                        <div className="card analytics-placeholder">
                            <LoadingBlock text="Loading charts…" />
                        </div>
                    ) : errorMsg ? (
                        <div className="error-inline" role="alert">
                            <AlertCircle className="icon icon-sm" aria-hidden="true" />
                            <span className="error-inline-text">{errorMsg}</span>
                        </div>
                    ) : (
                        <>
                            <div className="analytics-grid">
                                <ChartCard
                                    id="status-chart"
                                    title="Tasks by Status"
                                    subtitle={`${totalTasks} ${totalTasks === 1 ? 'task' : 'tasks'} by board column`}
                                    icon={<BarChart3 className="icon" />}
                                >
                                    <div className="chart-canvas" aria-hidden="true">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={statusChartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                                                <XAxis dataKey="name" interval={0} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART_COLORS.grid }} />
                                                <YAxis allowDecimals={false} width={36} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                                                <Tooltip content={<CountTooltip unit="task" />} cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }} />
                                                <Bar dataKey="tasks" name="Tasks" maxBarSize={44} radius={[6, 6, 0, 0]} isAnimationActive={false}>
                                                    {statusChartData.map((entry, index) => (
                                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                                    ))}
                                                </Bar>
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <table className="sr-only">
                                        <caption>Tasks by status</caption>
                                        <tbody>{statusChartData.map((d) => <tr key={d.name}><th scope="row">{d.name}</th><td>{d.tasks}</td></tr>)}</tbody>
                                    </table>
                                </ChartCard>

                                <ChartCard
                                    id="week-chart"
                                    title="Tasks by Week"
                                    subtitle="Number of tasks planned for each week"
                                    icon={<CalendarRange className="icon" />}
                                >
                                    <div className="chart-canvas" aria-hidden="true">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <BarChart data={weekChartData} margin={{ top: 12, right: 8, left: 0, bottom: 0 }}>
                                                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                                                <XAxis dataKey="weekLabel" interval={0} tick={AXIS_TICK} tickLine={false} axisLine={{ stroke: CHART_COLORS.grid }} />
                                                <YAxis allowDecimals={false} width={36} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                                                <Tooltip content={<CountTooltip unit="task" />} cursor={{ fill: 'rgba(148, 163, 184, 0.12)' }} />
                                                <Bar dataKey="tasks" name="Tasks" fill={CHART_COLORS.actual} maxBarSize={44} radius={[6, 6, 0, 0]} isAnimationActive={false} />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <table className="sr-only">
                                        <caption>Tasks by week</caption>
                                        <tbody>{weekChartData.map((d) => <tr key={d.weekLabel}><th scope="row">{d.weekLabel}</th><td>{d.tasks}</td></tr>)}</tbody>
                                    </table>
                                </ChartCard>
                            </div>

                            <section className="stagnation" aria-labelledby="stagnation-title">
                                <div className="analytics-header">
                                    <div>
                                        <h2 id="stagnation-title" className="section-title">
                                            <Hourglass className="icon icon-sm" aria-hidden="true" /> Time in Status
                                        </h2>
                                        <p className="section-subtitle">Days since each open task was last updated. More than 7 days is highlighted.</p>
                                    </div>
                                </div>
                                <div className="stagnation-grid">
                                    {renderStagnantTable('To Do', stagnantTables.todo, 'todo')}
                                    {renderStagnantTable('In Progress', stagnantTables.inProgress, 'progress')}
                                    {renderStagnantTable('Review', stagnantTables.review, 'review')}
                                </div>
                            </section>
                        </>
                    )}
                </main>
        </>
    );
}

// Bar tooltip: "<label> · <n> task(s)"
function CountTooltip({ active, payload, label, unit }) {
    if (!active || !payload || payload.length === 0) return null;
    const value = payload[0].value;
    return (
        <div className="chart-tooltip">
            <p className="chart-tooltip-label">{label}</p>
            <p className="chart-tooltip-row">
                <span className="chart-tooltip-name">Tasks</span>
                <span className="chart-tooltip-value">{value} {value === 1 ? unit : `${unit}s`}</span>
            </p>
        </div>
    );
}
