// App-wide notifications (replaces window.alert for errors / info / success).
// Anything can call notify(); <Notifier /> (mounted once in App.jsx) renders the toasts.
// queueNotice() is for flows that reload the page right after (e.g. window.location.href = '/login'):
// the notice is kept in sessionStorage and shown by <Notifier /> when the app starts again.

export const NOTIFY_EVENT = "app:notify";
const PENDING_KEY = "app:pendingNotice";

/** @param {{ type?: 'success'|'error'|'info', title: string, message?: string }} notice */
export function notify(notice) {
    window.dispatchEvent(new CustomEvent(NOTIFY_EVENT, { detail: notice }));
}

export function queueNotice(notice) {
    try {
        sessionStorage.setItem(PENDING_KEY, JSON.stringify(notice));
    } catch {
        // storage blocked: nothing to show after the reload
    }
}

export function takeQueuedNotice() {
    try {
        const raw = sessionStorage.getItem(PENDING_KEY);
        if (!raw) return null;
        sessionStorage.removeItem(PENDING_KEY);
        return JSON.parse(raw);
    } catch {
        return null;
    }
}
