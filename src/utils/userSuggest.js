// Invite-member suggestions (Project Settings). GET /user lists every account (password excluded);
// the page narrows it to people who can actually be invited.

const lower = (value) => String(value || "").trim().toLowerCase();

// email of a project member, whether userId is populated or not
const memberEmail = (member) => lower(member?.userId?.email || member?.email);

/**
 * Accounts matching `query` (username or email, case-insensitive) that are not already members
 * and not suspended. Matches at the start of the name / email come first. Empty query → [].
 */
export function suggestInvitees(users, members, query, limit = 8) {
    const q = lower(query);
    if (!q) return [];
    const taken = new Set((members || []).map(memberEmail).filter(Boolean));
    const scored = [];
    for (const user of users || []) {
        const email = lower(user?.email);
        if (!email || taken.has(email)) continue;
        if (user.status && user.status !== "Active") continue;
        const name = lower(user.username || user.name);
        let rank = -1;
        if (email.startsWith(q) || name.startsWith(q)) rank = 0;
        else if (email.includes(q) || name.includes(q)) rank = 1;
        if (rank !== -1) scored.push({ user, rank, name });
    }
    scored.sort((a, b) => a.rank - b.rank || a.name.localeCompare(b.name));
    return scored.slice(0, limit).map((s) => s.user);
}

// a typed value that looks like an email address (the backend looks the account up by email)
export const looksLikeEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(value || "").trim());

/**
 * Start / end date check for Project Settings (values are "YYYY-MM-DD").
 * A date in the past is only refused when the user CHANGED it: a project that already started (or ended)
 * must still be editable — e.g. renaming it must not require moving its start date.
 * Returns an error message or "".
 */
export function validateProjectDates({ startDate, dueDate }, saved, today) {
    if (startDate && startDate !== saved?.startDate && startDate < today) return "The start date cannot be in the past.";
    if (dueDate && dueDate !== saved?.dueDate && dueDate < today) return "The end date cannot be in the past.";
    if (startDate && dueDate && startDate > dueDate) return "The start date cannot be after the end date.";
    return "";
}
