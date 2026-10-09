import { Loader2 } from "lucide-react";
import { formatPoints } from "./chartTheme.js";

/**
 * Tooltip card used by every line chart: week label + one row per series, in the series order.
 * null values say "Not reached yet" (they are future weeks, never 0).
 */
export function ChartTooltip({ active, payload, label, series }) {
    if (!active || !payload || payload.length === 0) return null;
    const row = payload[0]?.payload || {};
    return (
        <div className="chart-tooltip">
            <p className="chart-tooltip-label">{label}</p>
            <ul className="chart-tooltip-list">
                {series.map((s) => (
                    <li key={s.key} className="chart-tooltip-row">
                        <span className={`chart-swatch${s.dashed ? " is-dashed" : ""}`} style={{ "--swatch": s.color }} aria-hidden="true" />
                        <span className="chart-tooltip-name">{s.name}</span>
                        <span className={`chart-tooltip-value${row[s.key] === null ? " is-empty" : ""}`}>{formatPoints(row[s.key])}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
}

// Legend rendered as HTML above the chart (keeps the series order and the dashed / solid distinction)
export function ChartLegend({ series }) {
    return (
        <ul className="chart-legend" aria-hidden="true">
            {series.map((s) => (
                <li key={s.key} className="chart-legend-item">
                    <span className={`chart-swatch${s.dashed ? " is-dashed" : ""}`} style={{ "--swatch": s.color }} />
                    {s.name}
                </li>
            ))}
        </ul>
    );
}

export function ChartCard({ id, title, subtitle, icon, children, className = "" }) {
    return (
        <section className={`card chart-card ${className}`} aria-labelledby={`${id}-title`}>
            <header className="chart-card-header">
                {icon && <span className="chart-card-icon" aria-hidden="true">{icon}</span>}
                <div className="chart-card-heading">
                    <h2 id={`${id}-title`} className="chart-card-title">{title}</h2>
                    {subtitle && <p className="chart-card-subtitle">{subtitle}</p>}
                </div>
            </header>
            <div className="chart-card-body">{children}</div>
        </section>
    );
}

export function ChartStats({ items }) {
    return (
        <dl className="chart-stats">
            {items.filter(Boolean).map((item) => (
                <div key={item.label} className="chart-stat">
                    <dt>{item.label}</dt>
                    <dd>{item.value}</dd>
                </div>
            ))}
        </dl>
    );
}

export function LoadingBlock({ text, className = "" }) {
    return (
        <div className={`page-loading chart-state ${className}`} role="status">
            <Loader2 className="icon animate-spin" aria-hidden="true" />
            <span>{text}</span>
        </div>
    );
}

export function EmptyBlock({ icon, title, desc, action, className = "" }) {
    return (
        <div className={`empty-state chart-state ${className}`}>
            <span className="empty-state-icon" aria-hidden="true">{icon}</span>
            <p className="empty-state-title">{title}</p>
            <p className="empty-state-desc">{desc}</p>
            {action}
        </div>
    );
}
