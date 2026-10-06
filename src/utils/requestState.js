// Pages load several requests in parallel and used to swallow failures with `.catch(() => fallback)`,
// which made a dead backend look like an empty or placeholder project. `withFallback` keeps exactly
// that fallback value (so the existing page logic is unchanged) but records the failure, so the page
// can show an error state instead of fake data.
export function withFallback(promise, fallback, failures, label) {
    return promise.catch((error) => {
        failures.push({ label, error });
        return fallback;
    });
}

// Human-readable message for a recorded failure
export function failureMessage(failure) {
    const msg = failure?.error?.message || "";
    if (!msg || /failed to fetch|networkerror|load failed/i.test(msg)) {
        return "Could not reach the server. Check your connection or that the backend is running, then try again.";
    }
    return msg;
}
