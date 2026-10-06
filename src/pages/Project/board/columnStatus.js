import { Circle, CircleCheck, CircleDashed, CircleDot, CircleDotDashed, CircleX } from "lucide-react";

// Visual status of a column, guessed from its name (columns are user-defined; unknown names stay neutral).
// Only the icon/color depends on this — no behaviour does.
export function getColumnStatus(name = "") {
    const n = name.toLowerCase();
    if (n.includes("cancel")) return { kind: "canceled", Icon: CircleX };
    if (n.includes("done") || n.includes("complete")) return { kind: "done", Icon: CircleCheck };
    if (n.includes("review") || /\b(qa|test|testing)\b/.test(n)) return { kind: "review", Icon: CircleDot };
    if (n.includes("progress") || n.includes("doing")) return { kind: "progress", Icon: CircleDotDashed };
    if (n.includes("backlog")) return { kind: "backlog", Icon: CircleDashed };
    if (n.includes("todo") || n.includes("to do")) return { kind: "todo", Icon: Circle };
    return { kind: "default", Icon: Circle };
}
