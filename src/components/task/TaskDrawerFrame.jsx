import { useEffect, useRef } from "react";
import { X } from "lucide-react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared shell of the task drawer (Board + My Tasks): right-side panel on desktop, full screen on phones.
 * Accessibility: role="dialog" + aria-modal, Esc / close button / backdrop close, focus moves into the panel,
 * Tab stays inside, focus returns to the element that opened it (or `returnFocusSelector` if that element
 * was re-rendered away — e.g. a task card replaced by a realtime update). Page scroll is locked while open.
 */
function TaskDrawerFrame({ open, onClose, labelledBy, headerContent, returnFocusSelector, children }) {
    const panelRef = useRef(null);
    const onCloseRef = useRef(onClose);
    const returnFocusRef = useRef(returnFocusSelector);
    useEffect(() => {
        onCloseRef.current = onClose;
        returnFocusRef.current = returnFocusSelector;
    }, [onClose, returnFocusSelector]);

    useEffect(() => {
        if (!open) return undefined;
        const opener = document.activeElement;
        const panel = panelRef.current;
        panel?.focus();

        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                onCloseRef.current();
                return;
            }
            if (e.key !== "Tab" || !panel) return;
            const items = [...panel.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
            if (items.length === 0) return;
            const first = items[0];
            const last = items[items.length - 1];
            if (e.shiftKey && (document.activeElement === first || document.activeElement === panel)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        };
        document.addEventListener("keydown", onKeyDown);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.removeEventListener("keydown", onKeyDown);
            document.body.style.overflow = prevOverflow;
            // give focus back to the opener; if there was none (a mouse press on a drag handle does not focus it,
            // so the opener is <body>) or it is gone (re-rendered), try the fallback; otherwise do nothing
            const target = opener && opener !== document.body && opener.isConnected
                ? opener
                : (returnFocusRef.current ? document.querySelector(returnFocusRef.current) : null);
            if (target && typeof target.focus === "function") target.focus();
        };
    }, [open]);

    if (!open) return null;

    return (
        <div className="drawer-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div
                ref={panelRef}
                className="drawer-panel task-drawer"
                role="dialog"
                aria-modal="true"
                aria-labelledby={labelledBy}
                tabIndex={-1}
            >
                <div className="drawer-header">
                    <div className="drawer-header-meta">{headerContent}</div>
                    <button type="button" className="icon-btn" onClick={onClose} aria-label="Close task details">
                        <X className="icon" aria-hidden="true" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default TaskDrawerFrame;
