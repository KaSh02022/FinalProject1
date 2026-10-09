// Project "Budget" and "Cost per Point" (POST / PUT /project — BACKEND_FRONTEND_SYNC_REPORT B3/B4).
// Both are numbers >= 0; the backend answers 400 otherwise. The backend only stores them (no cost formula),
// so the UI does not calculate anything from them.

export const FINANCE_FIELDS = [
    { key: "budget", label: "Budget" },
    { key: "costPerPoint", label: "Cost per Point" },
];

/**
 * Text from a number input → { value } (undefined = leave out of the request) or { error }.
 * An empty field is never sent: on create the backend uses 0, on update the stored value is kept.
 */
export function parseNonNegativeNumber(raw, label) {
    if (raw === undefined || raw === null || String(raw).trim() === "") return { value: undefined };
    const value = Number(raw);
    if (!Number.isFinite(value)) return { error: `${label} must be a number.` };
    if (value < 0) return { error: `${label} must be 0 or more.` };
    return { value };
}

/** { budget, costPerPoint } as typed → { payload } with only the filled-in fields, or { error } */
export function buildFinancePayload(form) {
    const payload = {};
    for (const { key, label } of FINANCE_FIELDS) {
        const parsed = parseNonNegativeNumber(form?.[key], label);
        if (parsed.error) return { error: parsed.error };
        if (parsed.value !== undefined) payload[key] = parsed.value;
    }
    return { payload };
}

// Stored value → input text. Older projects may not have the field at all: show an empty input, not "0".
export const toNumberInput = (value) => (typeof value === "number" && Number.isFinite(value) ? String(value) : "");
