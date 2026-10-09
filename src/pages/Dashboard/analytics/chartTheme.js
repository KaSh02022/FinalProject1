import { useEffect, useState } from "react";

// One chart palette for the whole app (SVG attributes need real colours; values mirror the CSS tokens).
// Meaning is fixed: the plan is always the dashed slate line, real progress always the solid primary line.
export const CHART_COLORS = {
    plan: "#94a3b8",      // --color-text-subtle
    actual: "#4f46e5",    // --color-primary-600
    grid: "#e2e8f0",      // --color-border
    axis: "#64748b",      // --color-text-muted
    now: "#cbd5e1",       // --color-border-strong
};

export const AXIS_TICK = { fontSize: 12, fill: CHART_COLORS.axis };

// narrow screens: several full "Week n" labels do not fit side by side → tilt them (labels stay the backend's)
export function useNarrowScreen(query = "(max-width: 639px)") {
    const [narrow, setNarrow] = useState(() => typeof window !== "undefined" && window.matchMedia(query).matches);
    useEffect(() => {
        const mql = window.matchMedia(query);
        const onChange = () => setNarrow(mql.matches);
        mql.addEventListener("change", onChange);
        return () => mql.removeEventListener("change", onChange);
    }, [query]);
    return narrow;
}

export const formatPoints = (value) => (value === null || value === undefined ? "Not reached yet" : `${value} pts`);
