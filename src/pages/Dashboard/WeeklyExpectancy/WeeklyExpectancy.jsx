import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { TrendingUp, SearchX, LogIn } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from "recharts";
import ErrorState from "../../../components/common/ErrorState.jsx";
import { failureMessage } from "../../../utils/requestState.js";
import { parseWeeklyExpectancy, summarizeWeeklyExpectancy, getWeeklyExpectancyErrorKind } from "../../../utils/weeklyExpectancy.js";
import { fetchWeeklyExpectancy } from "../../../../api.jsx";
import { ChartTooltip, ChartLegend, ChartCard, ChartStats, LoadingBlock, EmptyBlock } from "../analytics/chartKit.jsx";
import { CHART_COLORS, AXIS_TICK, useNarrowScreen } from "../analytics/chartTheme.js";

const SERIES = [
    { key: "expectancy", name: "Plan", color: CHART_COLORS.plan, dashed: true },
    { key: "realProgress", name: "Real progress", color: CHART_COLORS.actual },
];

/**
 * Plan vs. Real Progress (cumulative burn-UP) from GET /task/project/:projectId/weekly-expectancy.
 * Separate from the Epic Burndown on purpose: other contract, other week count (= maxProjectWeek, no "Start"),
 * other completion rule (task in the Done column). Values are drawn as returned; realProgress null = gap.
 */
function WeeklyExpectancy({ projectId, projectName, refreshToken = 0 }) {
    const [result, setResult] = useState(null);
    const [retryKey, setRetryKey] = useState(0);
    const reloadKey = `${refreshToken}:${retryKey}`;
    const narrow = useNarrowScreen();

    useEffect(() => {
        if (!projectId) return;
        let cancelled = false;
        fetchWeeklyExpectancy(projectId)
            .then((body) => {
                if (cancelled) return;
                const parsed = parseWeeklyExpectancy(body);
                setResult({ projectId, reloadKey, data: parsed, error: null, invalid: !parsed });
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Error loading plan vs. real progress:", err);
                setResult({ projectId, reloadKey, data: null, error: err, invalid: false });
            });
        return () => { cancelled = true; };
    }, [projectId, reloadKey]);

    const retry = () => setRetryKey((k) => k + 1);

    const current = result && result.projectId === projectId ? result : null;
    const loading = !current || current.reloadKey !== reloadKey;
    const data = current?.data || null;
    const error = loading ? null : current.error;
    const invalidResponse = !loading && current.invalid;
    const summary = summarizeWeeklyExpectancy(data);

    let body;
    if (error) {
        const kind = getWeeklyExpectancyErrorKind(error);
        if (kind === "auth") {
            body = (
                <EmptyBlock
                    icon={<LogIn className="icon" />}
                    title="Your session has ended"
                    desc="Sign in again to see the progress chart."
                    action={<Link to="/login" className="btn btn-outline btn-sm">Sign in</Link>}
                />
            );
        } else if (kind === "invalid-project") {
            body = (
                <EmptyBlock
                    icon={<SearchX className="icon" />}
                    title="Invalid project"
                    desc="This project ID is not valid. Pick another project."
                />
            );
        } else {
            body = (
                <ErrorState
                    title="Couldn't load plan vs. real progress"
                    message={failureMessage({ error })}
                    onRetry={retry}
                />
            );
        }
    } else if (invalidResponse) {
        body = (
            <ErrorState
                title="Couldn't read plan vs. real progress"
                message="The server sent progress data in an unexpected format."
                onRetry={retry}
            />
        );
    } else if (!data) {
        body = <LoadingBlock text="Loading progress…" className="expectancy-loading" />;
    } else if (data.weeks.length === 0) {
        body = (
            <EmptyBlock
                icon={<TrendingUp className="icon" />}
                title="No progress data yet"
                desc="This project has no tasks yet. Add tasks with points and a week on the board to see the plan."
                action={<Link to={`/projectboard/${projectId}`} className="btn btn-outline btn-sm">Open board</Link>}
                className="expectancy-empty"
            />
        );
    } else {
        const nowInChart = summary?.nowEntry;
        body = (
            <>
                <ChartStats items={[
                    { label: "Project week", value: `Week ${data.currentProjectWeek}` },
                    summary?.planEntry && { label: "Planned to date", value: `${summary.planEntry.expectancy} pts` },
                    summary?.latestReal && { label: "Done to date", value: `${summary.latestReal.realProgress} pts` },
                ]} />

                <ChartLegend series={SERIES} />
                <div className={`chart-canvas expectancy-chart${loading ? " is-refreshing" : ""}`} aria-hidden="true">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.weeks} margin={{ top: 22, right: 12, left: 0, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
                            <XAxis
                                dataKey="week"
                                interval={0}
                                padding={{ left: 12, right: narrow ? 8 : 24 }}
                                tick={AXIS_TICK}
                                angle={narrow && data.weeks.length > 4 ? -40 : 0}
                                textAnchor={narrow && data.weeks.length > 4 ? "end" : "middle"}
                                height={narrow && data.weeks.length > 4 ? 52 : 30}
                                tickLine={false}
                                axisLine={{ stroke: CHART_COLORS.grid }}
                            />
                            <YAxis allowDecimals={false} width={40} tick={AXIS_TICK} tickLine={false} axisLine={false} />
                            <Tooltip
                                content={<ChartTooltip series={SERIES} />}
                                cursor={{ stroke: CHART_COLORS.now, strokeDasharray: "4 4" }}
                            />
                            {nowInChart && (
                                <ReferenceLine
                                    x={nowInChart.week}
                                    stroke={CHART_COLORS.now}
                                    strokeDasharray="4 4"
                                    label={{ value: "Now", position: "top", fill: CHART_COLORS.axis, fontSize: 11 }}
                                />
                            )}
                            <Line
                                type="linear"
                                dataKey="expectancy"
                                name="Plan"
                                stroke={CHART_COLORS.plan}
                                strokeWidth={2}
                                strokeDasharray="6 4"
                                dot={{ r: 3, fill: CHART_COLORS.plan, strokeWidth: 0 }}
                                isAnimationActive={false}
                            />
                            {/* connectNulls off: weeks that have not happened (realProgress null) are a gap */}
                            <Line
                                type="linear"
                                dataKey="realProgress"
                                name="Real progress"
                                stroke={CHART_COLORS.actual}
                                strokeWidth={2.5}
                                connectNulls={false}
                                dot={{ r: 4, fill: CHART_COLORS.actual, stroke: "#fff", strokeWidth: 1.5 }}
                                activeDot={{ r: 5 }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>

                <table className="sr-only expectancy-table">
                    <caption>Plan vs. real progress of {projectName || "the selected project"}</caption>
                    <thead>
                        <tr><th scope="col">Week</th><th scope="col">Plan</th><th scope="col">Real progress</th></tr>
                    </thead>
                    <tbody>
                        {data.weeks.map((w) => (
                            <tr key={w.weekNumber} data-real={w.realProgress === null ? "null" : w.realProgress}>
                                <th scope="row">{w.week}</th>
                                <td>{w.expectancy}</td>
                                <td>{w.realProgress === null ? "No data yet" : w.realProgress}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                <p className="chart-note">
                    Cumulative points planned by task week vs. points finished in the Done column.
                    Weeks count from the first task's creation date (the burndown counts from the project start date).
                    {summary?.pastPlan && ` The project is in week ${data.currentProjectWeek}, after the last planned week (${data.maxProjectWeek}).`}
                </p>
            </>
        );
    }

    return (
        <ChartCard
            id="expectancy"
            className="expectancy-card"
            title="Plan vs. Real Progress"
            subtitle="Cumulative points: plan vs. done"
            icon={<TrendingUp className="icon" />}
        >
            <div className="expectancy-body" aria-busy={loading}>{body}</div>
        </ChartCard>
    );
}

export default WeeklyExpectancy;
