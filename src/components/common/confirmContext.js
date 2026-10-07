import { createContext, useContext } from "react";

export const ConfirmContext = createContext(null);

/**
 * const confirm = useConfirm();
 * const ok = await confirm({ title, message, confirmLabel, cancelLabel, tone: 'danger', onConfirm });
 *
 * - Resolves true when confirmed (and onConfirm, if given, finished), false when cancelled.
 * - With onConfirm the dialog stays open while it runs (buttons disabled, spinner), shows the error
 *   if it throws, and closes only after it succeeds. Without onConfirm it behaves like window.confirm.
 */
export function useConfirm() {
    const confirm = useContext(ConfirmContext);
    if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
    return confirm;
}
