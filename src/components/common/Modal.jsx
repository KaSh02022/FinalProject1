import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";

const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

/**
 * Shared shell for form modals (create task / project, invite member, add note). Render it only while open.
 * The page keeps its form, state and handlers; this only provides the frame:
 * role="dialog" + aria-modal + title, close button, Esc / backdrop close, focus moves to the first field,
 * Tab stays inside, focus returns to the trigger, page scroll locked. Keys are handled at window capture
 * (same as ConfirmDialog) so nothing underneath reacts to Esc / Tab.
 * Destructive confirmations use ConfirmDialog (useConfirm), not this component.
 */
function Modal({ title, description, onClose, size = "md", children }) {
    const dialogRef = useRef(null);
    const onCloseRef = useRef(onClose);
    const titleId = useId();
    const descId = useId();
    useEffect(() => { onCloseRef.current = onClose; }, [onClose]);

    useEffect(() => {
        const opener = document.activeElement;
        const dialog = dialogRef.current;
        // first field of the form (or the close button when there is none)
        const first = dialog?.querySelector(".modal-body input:not([disabled]), .modal-body select:not([disabled]), .modal-body textarea:not([disabled])")
            || dialog?.querySelector(FOCUSABLE);
        if (dialog && !dialog.contains(document.activeElement)) first?.focus();

        const onKeyDown = (e) => {
            if (e.key === "Escape") {
                // an open combobox list inside the modal closes first (its own handler), the modal stays
                if (e.target?.getAttribute?.("aria-expanded") === "true") return;
                e.stopPropagation();
                e.preventDefault();
                onCloseRef.current();
                return;
            }
            if (e.key !== "Tab" || !dialog) return;
            e.stopPropagation();
            const items = [...dialog.querySelectorAll(FOCUSABLE)].filter((el) => el.offsetParent !== null);
            if (items.length === 0) return;
            const firstItem = items[0];
            const lastItem = items[items.length - 1];
            const inside = dialog.contains(document.activeElement);
            if (e.shiftKey && (!inside || document.activeElement === firstItem)) {
                e.preventDefault();
                lastItem.focus();
            } else if (!e.shiftKey && (!inside || document.activeElement === lastItem)) {
                e.preventDefault();
                firstItem.focus();
            }
        };
        window.addEventListener("keydown", onKeyDown, true);
        const prevOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            window.removeEventListener("keydown", onKeyDown, true);
            const otherDialogOpen = [...document.querySelectorAll('[aria-modal="true"]')].some((el) => el !== dialog);
            document.body.style.overflow = otherDialogOpen ? "hidden" : (prevOverflow === "hidden" ? "" : prevOverflow);
            if (opener && opener !== document.body && opener.isConnected && typeof opener.focus === "function") opener.focus();
        };
    }, []);

    return (
        <div className="modal-overlay form-modal-overlay" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose(); }}>
            <div
                ref={dialogRef}
                className={`modal-box form-modal size-${size}`}
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={description ? descId : undefined}
            >
                <div className="modal-header">
                    <div className="form-modal-heading">
                        <h2 id={titleId} className="modal-title">{title}</h2>
                        {description && <p id={descId} className="modal-desc">{description}</p>}
                    </div>
                    <button type="button" className="icon-btn" onClick={onClose} aria-label="Close dialog">
                        <X className="icon" aria-hidden="true" />
                    </button>
                </div>
                {children}
            </div>
        </div>
    );
}

export default Modal;
