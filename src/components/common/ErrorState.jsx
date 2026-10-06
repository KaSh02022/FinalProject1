import { AlertTriangle, RotateCw } from "lucide-react";

// Shown when a request failed — never replace a failed request with empty or placeholder data.
// variant="page": the page cannot be shown at all (e.g. the project itself failed to load).
// variant="inline": the page is usable but part of its data is missing.
function ErrorState({
    title = "Something went wrong",
    message,
    onRetry,
    retrying = false,
    variant = "page",
}) {
    if (variant === "inline") {
        return (
            <div className="error-inline" role="alert">
                <AlertTriangle className="icon icon-sm" aria-hidden="true" />
                <span className="error-inline-text">
                    <strong>{title}</strong>
                    {message && <span className="error-inline-message"> {message}</span>}
                </span>
                {onRetry && (
                    <button type="button" className="btn btn-ghost btn-sm" onClick={onRetry} disabled={retrying}>
                        <RotateCw className={`icon icon-sm${retrying ? " animate-spin" : ""}`} aria-hidden="true" />
                        Retry
                    </button>
                )}
            </div>
        );
    }

    return (
        <div className="error-state" role="alert">
            <span className="error-state-icon" aria-hidden="true">
                <AlertTriangle className="icon" />
            </span>
            <p className="error-state-title">{title}</p>
            {message && <p className="error-state-desc">{message}</p>}
            {onRetry && (
                <button type="button" className="btn btn-outline btn-sm" onClick={onRetry} disabled={retrying}>
                    <RotateCw className={`icon icon-sm${retrying ? " animate-spin" : ""}`} aria-hidden="true" />
                    {retrying ? "Retrying…" : "Retry"}
                </button>
            )}
        </div>
    );
}

export default ErrorState;
