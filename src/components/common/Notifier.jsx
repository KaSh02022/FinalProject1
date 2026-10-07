import { useEffect, useState } from "react";
import { CircleAlert, CircleCheck, Info, X } from "lucide-react";
import { NOTIFY_EVENT, takeQueuedNotice } from "../../utils/notify.js";

const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };
const DURATION_MS = { success: 4000, info: 5000, error: 7000 };

let nextId = 1;

/**
 * Renders notices sent with notify() (utils/notify.js) as toasts, bottom-right.
 * Errors are announced assertively (role="alert"), others politely (role="status").
 */
function Notifier() {
    const [items, setItems] = useState([]);

    useEffect(() => {
        const timers = [];
        const dismiss = (id) => setItems((prev) => prev.filter((t) => t.id !== id));
        const push = (notice) => {
            if (!notice?.title) return;
            const type = ICONS[notice.type] ? notice.type : "info";
            const id = nextId++;
            setItems((prev) => [...prev.slice(-3), { id, type, title: notice.title, message: notice.message || "" }]);
            timers.push(setTimeout(() => dismiss(id), DURATION_MS[type]));
        };
        const onNotify = (e) => push(e.detail);

        window.addEventListener(NOTIFY_EVENT, onNotify);
        // a notice queued before a full page reload (e.g. suspended account -> /login)
        // (read on the next tick: a StrictMode double-run clears this first timer before it fires)
        timers.push(setTimeout(() => {
            const queued = takeQueuedNotice();
            if (queued) push(queued);
        }, 0));

        return () => {
            window.removeEventListener(NOTIFY_EVENT, onNotify);
            timers.forEach(clearTimeout);
        };
    }, []);

    if (items.length === 0) return null;

    return (
        <div className="toast-viewport app-toasts">
            {items.map((t) => {
                const Icon = ICONS[t.type];
                return (
                    <div key={t.id} className={`toast variant-${t.type}`} role={t.type === "error" ? "alert" : "status"}>
                        <Icon className="toast-icon icon" aria-hidden="true" />
                        <div className="toast-body">
                            <p className="toast-title">{t.title}</p>
                            {t.message && <p className="toast-desc">{t.message}</p>}
                        </div>
                        <button
                            type="button"
                            className="toast-close icon-btn"
                            onClick={() => setItems((prev) => prev.filter((x) => x.id !== t.id))}
                            aria-label="Dismiss notification"
                        >
                            <X className="icon icon-sm" aria-hidden="true" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
}

export default Notifier;
