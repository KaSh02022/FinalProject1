import KPI from "./KPI/KPI";
import ProjectAnalytics from "./analytics/ProjectAnalytics";
import PortfolioOverview from "./portfolio/PortfolioOverview";

// Name of the signed-in user as stored by the login page ("" when unknown — never a made-up name)
const getStoredUserName = () => {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        return (user?.username || user?.name || "").trim();
    } catch {
        return "";
    }
};

// Only widgets backed by a real API are rendered. TodayTask, UCMDeadlines, RecentActivity, TaskCompletion,
// TeamWorkload and ProjectStatus contain static sample data and have no endpoint — they stay hidden
// (files kept in ./OverViews and ./ProjectProgress until real data exists).
function Dashboard() {
    const userName = getStoredUserName();
    return (
        <main className="page-content">
            <div className="page-content-inner stack dashboard-page">
                <div>
                    <h1>{userName ? `Welcome back, ${userName}` : "Welcome back"}</h1>
                    <p className="page-subtitle">Here's what's happening across your workspace today.</p>
                </div>

                <KPI />
                <PortfolioOverview />
                <ProjectAnalytics />
            </div>
        </main>
    );
}
export default Dashboard;
