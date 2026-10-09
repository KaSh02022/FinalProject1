import { useCallback, useEffect, useId, useRef, useState } from "react";
import { AlertTriangle, Loader2, X } from "lucide-react";
import { ConfirmContext } from "./confirmContext.js";
import { notify } from "../../utils/notify.js";

const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * The one shared confirmation modal (replaces window.confirm). Mounted once in App.jsx; pages call useConfirm().
 * Accessibility: role="alertdialog" + aria-modal, focus moves to Cancel (safe default for destructive actions),
 * Tab stays inside, Esc / X / backdrop cancel (not while the action is running), focus returns to the trigger.
 * Keys are handled at window capture so a Task Drawer underneath does not also react to Esc / Tab.
 */
function ConfirmProvider({ children }) {
    const [request, setRequest] = useState(null); // { options, resolve }
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState("");
    const busyRef = useRef(false);
    const dialogRef = useRef(null);
    const openerRef = useRef(null);
    const titleId = useId();
    const descId = useId();

    const confirm = useCallback((options) => new Promise((resolve) => {
        // remember the trigger now: it may be re-rendered away while the dialog is open
        openerRef.current = document.activeElement;
        setRequest((prev) => {
            prev?.resolve(false); // a newer request replaces an unanswered one
            return { options: options || {}, resolve };
        });
        setError("");
        setBusy(false);
        busyRef.current = false;
    }), []);

    const finish = useCallback((result) => {
        setRequest((prev) => {
            prev?.resolve(result);
            return null;
        });
        setError("");
        setBusy(false);
        busyRef.current = false;
    }, []);

    const cancel = useCallback(() => {
        if (busyRef.current) return;
        finish(false);
    }, [finish]);

    const handleConfirm = async () => {
        if (busyRef.current || !request) return; // no double submit
        const { onConfirm } = request.options;
        if (!onConfirm) {
            finish(true);
            return;
        }
        busyRef.current = true;
        setBusy(true);
        setError("");
        try {
            await onConfirm();
            finish(true);
            if (request.options.successMessage) notify({ type: "success", title: request.options.successMessage });
        } catch (err) {
            busyRef.current = false;
            setBusy(false);
            setError(err?.message || "Something went wrong. Please try again.");
            // the buttons were disabled (focus lost): put focus back once they are enabled again
            setTimeout(() => dialogRef.current?.querySelector("[data-autofocus]")?.focus(), 0);
        }
    };

    const open = Boolean(request);
    const cancelRef = useRef(cancel);
    useEffect(() => { cancelRef.current = cancel; }, [cancel]);

    useEffect(() => {
        if (!open) return undefined;
        const opener = openerRef.current;
        const dialog = dialogRef.current;
        dialog?.querySelector("[data-autofocus]")?.focus();

        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                e.stopPropagation();
                e.preventDefault();
                cancelRef.current();
                return;
            }
            if (e.key !== "Tab" || !dialog) return;
            e.stopPropagation();
            const items = [...dialog.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
            if (items.length === 0) {
                e.preventDefault();
                return;
            }
            const first = items[0];
            const last = items[items.length - 1];
            const inside = dialog.contains(document.activeElement);
            if (e.shiftKey && (!inside || document.activeElement === first)) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && (!inside || document.activeElement === last)) {
                e.preventDefault();
                first.focus();
            }
        };
        window.addEventListener("keydown", onKeyDown, true);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", onKeyDown, true);
            // keep the page locked if another dialog (e.g. the Task Drawer) is still open
            const otherDialogs = [...document.querySelectorAll('[aria-modal="true"]')].filter((el) => el !== dialog);
            document.body.style.overflow = otherDialogs.length > 0 ? "hidden" : (prevOverflow === "hidden" ? "" : prevOverflow);
            // focus back to the trigger; if it is gone, to the dialog underneath (e.g. the Task Drawer)
            const target = opener && opener !== document.body && opener.isConnected
                ? opener
                : otherDialogs[otherDialogs.length - 1];
            if (target && typeof target.focus === "function") target.focus();
        };
    }, [open]);

    const options = request?.options || {};
    const danger = options.tone === "danger";

    return (
        <ConfirmContext.Provider value={confirm}>
            {children}
            {open && (
                <div
                    className="modal-overlay confirm-overlay"
                    onMouseDown={(e) => { if (e.target === e.currentTarget) cancel(); }}
                >
                    <div
                        ref={dialogRef}
                        className="modal-box size-sm confirm-dialog"
                        role="alertdialog"
                        aria-modal="true"
                        aria-labelledby={titleId}
                        aria-describedby={options.message ? descId : undefined}
                        aria-busy={busy || undefined}
                    >
                        <div className="modal-header">
                            <div className="confirm-heading">
                                {danger && (
                                    <span className="confirm-icon" aria-hidden="true">
                                        <AlertTriangle className="icon" />
                                    </span>
                                )}
                                <h2 id={titleId} className="modal-title">{options.title || "Are you sure?"}</h2>
                            </div>
                            <button
                                type="button"
                                className="icon-btn"
                                onClick={cancel}
                                disabled={busy}
                                aria-label="Close dialog"
                            >
                                <X className="icon" aria-hidden="true" />
                            </button>
                        </div>
                        {(options.message || error) && (
                            <div className="modal-body confirm-body">
                                {options.message && <p id={descId} className="confirm-message">{options.message}</p>}
                                {error && (
                                    <p className="confirm-error" role="alert">
                                        <AlertTriangle className="icon icon-sm" aria-hidden="true" />
                                        <span>{error}</span>
                                    </p>
                                )}
                            </div>
                        )}
                        <div className="modal-footer confirm-footer">
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={cancel}
                                disabled={busy}
                                data-autofocus
                            >
                                {options.cancelLabel || "Cancel"}
                            </button>
                            <button
                                type="button"
                                className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
                                onClick={handleConfirm}
                                disabled={busy}
                            >
                                {busy && <Loader2 className="icon icon-sm animate-spin" aria-hidden="true" />}
                                {busy ? (options.busyLabel || "Working…") : (options.confirmLabel || "Confirm")}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </ConfirmContext.Provider>
    );
}

export default ConfirmProvider;
