import { useState } from "react";
import { AlertTriangle, Loader2, Plus, RotateCw, Search, Send, Trash2 } from "lucide-react";
import { avatarToneClass, getInitials } from "../../utils/avatar.js";

// Small inline error used inside drawer sections (load or mutation failure)
function SectionError({ message, onRetry }) {
    return (
        <div className="drawer-inline-error" role="alert">
            <AlertTriangle className="icon icon-sm" aria-hidden="true" />
            <span>{message}</span>
            {onRetry && (
                <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry}>
                    <RotateCw className="icon icon-sm" aria-hidden="true" /> Retry
                </button>
            )}
        </div>
    );
}

export function UserAvatar({ userId, name, size = "sm" }) {
    return (
        <span className={`avatar avatar-${size} ${avatarToneClass(userId)}`} title={name} aria-hidden="true">
            {getInitials(name)}
        </span>
    );
}

export function DrawerSection({ title, meta, children }) {
    return (
        <section className="drawer-section">
            <div className="drawer-section-head">
                <h3 className="drawer-section-title">{title}</h3>
                {meta != null && <span className="drawer-section-meta">{meta}</span>}
            </div>
            {children}
        </section>
    );
}

/**
 * Checklist: progress, toggle, add, delete. Every action is a promise from the page; while one runs the
 * item is disabled, and a failure is shown (the page rolls back its own optimistic state).
 */
export function ChecklistSection({ items = [], canToggle, canAdd, canDelete, onToggle, onAdd, onDelete }) {
    const [text, setText] = useState("");
    const [pendingId, setPendingId] = useState(null);
    const [adding, setAdding] = useState(false);
    const [error, setError] = useState("");
    const done = items.filter((i) => i.completed).length;
    const percent = items.length ? Math.round((done / items.length) * 100) : 0;

    const run = async (id, action) => {
        setError("");
        setPendingId(id);
        try {
            await action();
        } catch (err) {
            setError(err?.message || "Action failed. Please try again.");
        } finally {
            setPendingId(null);
        }
    };

    const submit = async (e) => {
        e.preventDefault();
        const value = text.trim();
        if (!value || adding) return;
        setError("");
        setAdding(true);
        try {
            await onAdd(value);
            setText("");
        } catch (err) {
            setError(err?.message || "Couldn't add the item.");
        } finally {
            setAdding(false);
        }
    };

    return (
        <DrawerSection title="Checklist" meta={items.length ? `${done}/${items.length}` : null}>
            {items.length > 0 && (
                <div className="progress-bar drawer-progress" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={percent} aria-label="Checklist progress">
                    <span className="progress-bar-fill tone-success" style={{ width: `${percent}%` }}></span>
                </div>
            )}
            {items.length === 0 && <p className="drawer-empty">No checklist items yet.</p>}
            <ul className="drawer-checklist">
                {items.map((item, index) => {
                    const id = item._id || index;
                    const busy = pendingId === id;
                    return (
                        <li key={id} className={`drawer-checklist-item${item.completed ? " is-done" : ""}${busy ? " is-busy" : ""}`}>
                            <label>
                                <input
                                    type="checkbox"
                                    className="checkbox"
                                    checked={!!item.completed}
                                    disabled={!canToggle || busy}
                                    onChange={() => run(id, () => onToggle(item))}
                                />
                                <span className="drawer-checklist-text">{item.text || item.title}</span>
                            </label>
                            {busy && <Loader2 className="icon icon-sm animate-spin" aria-label="Saving" />}
                            {canDelete && !busy && (
                                <button
                                    type="button"
                                    className="icon-btn icon-btn-sm drawer-item-delete"
                                    onClick={() => run(id, () => onDelete(item))}
                                    aria-label={`Delete checklist item: ${item.text || item.title}`}
                                    data-tooltip="Delete"
                                >
                                    <Trash2 className="icon icon-sm" aria-hidden="true" />
                                </button>
                            )}
                        </li>
                    );
                })}
            </ul>
            {error && <SectionError message={error} />}
            {canAdd && (
                <form className="drawer-inline-form" onSubmit={submit}>
                    <input
                        className="input"
                        placeholder="Add checklist item…"
                        aria-label="New checklist item"
                        value={text}
                        disabled={adding}
                        onChange={(e) => setText(e.target.value)}
                    />
                    <button type="submit" className="btn btn-secondary drawer-inline-submit" disabled={adding || !text.trim()} aria-label="Add checklist item">
                        {adding ? <Loader2 className="icon icon-sm animate-spin" aria-hidden="true" /> : <Plus className="icon icon-sm" aria-hidden="true" />}
                    </button>
                </form>
            )}
        </DrawerSection>
    );
}

/** Comments in the order the backend returns them (oldest first); compose box keeps the text if sending fails. */
export function CommentsSection({ comments = [], loadError, onRetry, onSubmit }) {
    const [text, setText] = useState("");
    const [sending, setSending] = useState(false);
    const [error, setError] = useState("");

    const submit = async (e) => {
        e.preventDefault();
        const value = text.trim();
        if (!value || sending) return;
        setError("");
        setSending(true);
        try {
            await onSubmit(value);
            setText("");
        } catch (err) {
            setError(err?.message || "Couldn't send the comment.");
        } finally {
            setSending(false);
        }
    };

    return (
        <DrawerSection title="Comments" meta={comments.length || null}>
            {loadError ? (
                <SectionError message={`Couldn't load comments. ${loadError}`} onRetry={onRetry} />
            ) : comments.length === 0 ? (
                <p className="drawer-empty">No comments yet.</p>
            ) : (
                <ul className="drawer-comments">
                    {comments.map((c, i) => {
                        const user = c.user || {};
                        const name = user.username || user.name || user.email || "Unknown user";
                        return (
                            <li key={c._id || i} className="drawer-comment">
                                <UserAvatar userId={user._id || user.id} name={name} />
                                <div className="drawer-comment-body">
                                    <div className="drawer-comment-head">
                                        <span className="drawer-comment-author">{name}</span>
                                        {c.createdAt && <time dateTime={c.createdAt}>{formatDateTime(c.createdAt)}</time>}
                                    </div>
                                    <p className="drawer-comment-text">{c.text}</p>
                                </div>
                            </li>
                        );
                    })}
                </ul>
            )}
            <form className="drawer-comment-form" onSubmit={submit}>
                <textarea
                    className="textarea"
                    rows="2"
                    placeholder="Write a comment…"
                    aria-label="Write a comment"
                    value={text}
                    disabled={sending}
                    onChange={(e) => setText(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit(e); }}
                />
                {error && <SectionError message={error} />}
                <div className="drawer-comment-actions">
                    <span className="drawer-hint">Ctrl + Enter to send</span>
                    <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !text.trim()}>
                        {sending ? <Loader2 className="icon icon-sm animate-spin" aria-hidden="true" /> : <Send className="icon icon-sm" aria-hidden="true" />}
                        {sending ? "Sending…" : "Send"}
                    </button>
                </div>
            </form>
        </DrawerSection>
    );
}

/** Activity exactly in backend order (newest first). */
export function ActivitySection({ activities = [], loadError, onRetry }) {
    return (
        <DrawerSection title="Activity">
            {loadError ? (
                <SectionError message={`Couldn't load activity. ${loadError}`} onRetry={onRetry} />
            ) : activities.length === 0 ? (
                <p className="drawer-empty">No activity yet.</p>
            ) : (
                <ol className="drawer-activity">
                    {activities.map((a, i) => {
                        const user = a.user || {};
                        const name = user.username || user.name || user.email || "Someone";
                        return (
                            <li key={a._id || i} className="drawer-activity-item">
                                <span className="drawer-activity-dot" aria-hidden="true"></span>
                                <p>
                                    <strong>{name}</strong> {a.action || "updated the task"}
                                    {a.createdAt && <time dateTime={a.createdAt}>{formatDateTime(a.createdAt)}</time>}
                                </p>
                            </li>
                        );
                    })}
                </ol>
            )}
        </DrawerSection>
    );
}

/** Assignee picker over project members (Member records → their USER id, which is what Task.assignees stores). */
export function AssigneePicker({ members, selectedIds, canEdit, onToggle, getUserId, getName, getEmail }) {
    const [query, setQuery] = useState("");
    const q = query.trim().toLowerCase();
    const list = q ? members.filter((m) => `${getName(m)} ${getEmail(m)}`.toLowerCase().includes(q)) : members;
    const selected = new Set(selectedIds.map(String));

    return (
        <div className="drawer-assignees">
            {canEdit && members.length > 5 && (
                <div className="input-icon-wrap">
                    <Search className="icon icon-sm" aria-hidden="true" />
                    <input className="input" type="search" placeholder="Search members…" aria-label="Search members" value={query} onChange={(e) => setQuery(e.target.value)} />
                </div>
            )}
            {members.length === 0 ? (
                <p className="drawer-empty">No project members loaded.</p>
            ) : (
                <ul className="drawer-assignee-list" aria-label="Assignees">
                    {list.map((m, i) => {
                        const userId = getUserId(m);
                        const name = getName(m);
                        const email = getEmail(m);
                        return (
                            <li key={userId || i}>
                                <label className={`drawer-assignee${canEdit ? "" : " is-readonly"}`}>
                                    <input type="checkbox" className="checkbox" checked={selected.has(String(userId))} disabled={!canEdit} onChange={() => onToggle(m)} />
                                    <UserAvatar userId={userId} name={name} size="xs" />
                                    <span className="drawer-assignee-text">
                                        <span>{name}</span>
                                        {email && <span className="drawer-assignee-email">{email}</span>}
                                    </span>
                                </label>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

function formatDateTime(value) {
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return "";
    return d.toLocaleString("en-GB", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
}
