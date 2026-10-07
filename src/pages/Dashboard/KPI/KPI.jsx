import { useState, useEffect } from 'react';
import { FolderKanban, Loader2 } from 'lucide-react';
import ErrorState from '../../../components/common/ErrorState.jsx';
import { failureMessage } from '../../../utils/requestState.js';
import { fetchPortfolio } from '../../../../api.jsx';

/**
 * Workspace statistics from GET /project/portfolio.
 * Only "Total Projects" is shown: the same response also has `totalBudget` and `onTimeRate`, but the
 * backend never receives a budget (always 0) and counts "done" tasks by a status value it never writes
 * (always 0% / 100%) — showing them would present placeholder numbers as facts (see the master doc).
 */
function KPI() {
    const [portfolio, setPortfolio] = useState(null);
    const [loading, setLoading] = useState(true);
    // request failed: show the error, never 0
    const [loadError, setLoadError] = useState(null);
    const [reloadKey, setReloadKey] = useState(0);

    useEffect(() => {
        let cancelled = false;
        fetchPortfolio()
            .then((data) => {
                if (cancelled) return;
                setPortfolio(data || null);
                setLoading(false);
            })
            .catch((err) => {
                if (cancelled) return;
                console.error("Lỗi khi đồng bộ dữ liệu KPI:", err);
                setLoadError(err);
                setLoading(false);
            });
        return () => { cancelled = true; };
    }, [reloadKey]);

    const retryLoad = () => {
        setLoadError(null);
        setLoading(true);
        setReloadKey((k) => k + 1);
    };

    if (loading) {
        return (
            <div className="page-loading kpi-loading" role="status">
                <Loader2 className="icon animate-spin" aria-hidden="true" />
                <span>Đang tải số liệu hệ thống...</span>
            </div>
        );
    }

    if (loadError) {
        return (
            <ErrorState
                title="Couldn't load workspace statistics"
                message={failureMessage({ error: loadError })}
                onRetry={retryLoad}
            />
        );
    }

    const totalProjects = Number(portfolio?.totalProjects);
    // a response without the number is not a 0: show nothing rather than a made-up value
    if (!Number.isFinite(totalProjects)) return null;

    return (
        <section className="grid-stats" aria-label="Workspace statistics">
            <div className="card stat-card">
                <span className="stat-card-icon tone-primary" aria-hidden="true">
                    <FolderKanban className="icon" />
                </span>
                <div>
                    <p className="stat-card-label">Total Projects</p>
                    <p className="stat-card-value">{totalProjects}</p>
                </div>
            </div>
        </section>
    );
}

export default KPI;
