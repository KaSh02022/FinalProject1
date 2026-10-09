import { createContext, useContext } from "react";

export const ConfirmContext = createContext(null);

/**
 * const confirm = useConfirm();
 * const ok = await confirm({ title, message, confirmLabel, cancelLabel, tone: 'danger', onConfirm, successMessage });
 *
 * - Resolves true when confirmed (and onConfirm, if given, finished), false when cancelled.
 * - With onConfirm the dialog stays open while it runs (buttons disabled, spinner), shows the error
 *   if it throws, and closes only after it succeeds. Without onConfirm it behaves like window.confirm.
 * - successMessage: toast shown after onConfirm succeeded.
 *
 * Every delete in the app goes through deleteConfirm() / removeConfirm() so the wording is the same everywhere.
 */
export function useConfirm() {
    const confirm = useContext(ConfirmContext);
    if (!confirm) throw new Error("useConfirm must be used inside <ConfirmProvider>");
    return confirm;
}

// what is being deleted → "this task", "this project"...; a known name is quoted instead
const ITEM_LABELS = {
    task: "this task",
    project: "this project",
    column: "this column",
    note: "this note",
    checklist: "this checklist item",
    document: "this document",
};
const ITEM_NAMES = {
    task: "Task",
    project: "Project",
    column: "Column",
    note: "Note",
    checklist: "Checklist item",
    document: "Document",
};

/**
 * Options for confirm() before a delete. The backend deletes records permanently (no restore endpoint),
 * so "This action cannot be undone." is accurate for every delete endpoint used by the app.
 */
export function deleteConfirm({ item, name, onConfirm, successMessage }) {
    const what = name ? `"${name}"` : (ITEM_LABELS[item] || "this item");
    return {
        title: "Are you sure?",
        message: `Are you sure you want to delete ${what}? This action cannot be undone.`,
        confirmLabel: "Delete",
        busyLabel: "Deleting…",
        cancelLabel: "Cancel",
        tone: "danger",
        onConfirm,
        successMessage: successMessage ?? `${ITEM_NAMES[item] || "Item"} deleted`,
    };
}

// Removing a member from a project (the user account itself is kept)
export function removeMemberConfirm({ name, onConfirm }) {
    return {
        title: "Are you sure?",
        message: `Are you sure you want to remove ${name ? `"${name}"` : "this member"} from the project? They will lose access to its tasks.`,
        confirmLabel: "Remove",
        busyLabel: "Removing…",
        cancelLabel: "Cancel",
        tone: "danger",
        onConfirm,
        successMessage: "Member removed",
    };
}
