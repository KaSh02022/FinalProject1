import KPI from "./KPI/KPI";
import RecentActivity from "./OverViews/RecentActivity";
import TaskCompletion from "./OverViews/TaskCompletion";
import TeamWorkload from "./OverViews/TeamWorkload";
import ProjectStatus from "./ProjectProgress/ProjectStatus";
import ProjectProgress from "./ProjectProgress/ProjectStatus";
import TodayTask from "./ProjectProgress/TodayTask";
import UCMDeadlines from "./ProjectProgress/UCMDeadlines";

// Name of the signed-in user as stored by the login page ("" when unknown — never a made-up name)
const getStoredUserName = () => {
    try {
        const user = JSON.parse(localStorage.getItem("user") || "null");
        return (user?.username || user?.name || "").trim();
    } catch {
        return "";
    }
};

function Dashboard(){
    const userName = getStoredUserName();
    return(
        <>
    <main className="page-content">
        <div className="page-content-inner stack">
          <div>
            <h1>{userName ? `Welcome back, ${userName}` : "Welcome back"}</h1>
            <p className="page-subtitle">Here's what's happening across your workspace today.</p>
          </div>

        <KPI/>
         <div className="grid-3">
            
         </div>
        <div className="grid-3">
          </div>    
        </div>
      </main>
        </>
    )
}
export default Dashboard;

