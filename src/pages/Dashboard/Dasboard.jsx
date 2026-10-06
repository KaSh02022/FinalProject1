import KPI from "./KPI/KPI";
import RecentActivity from "./OverViews/RecentActivity";
import TaskCompletion from "./OverViews/TaskCompletion";
import TeamWorkload from "./OverViews/TeamWorkload";
import ProjectStatus from "./ProjectProgress/ProjectStatus";
import ProjectProgress from "./ProjectProgress/ProjectStatus";
import TodayTask from "./ProjectProgress/TodayTask";
import UCMDeadlines from "./ProjectProgress/UCMDeadlines";

function Dashboard(){
    return(
        <>
    <main class="page-content">
        <div class="page-content-inner stack">
          <div>
            <h1>Welcome back, Cao</h1>
            <p class="page-subtitle">Here's what's happening across your workspace today.</p>
          </div>

        <KPI/>
         <div class="grid-3">
            
         </div>
        <div class="grid-3">
          </div>      
        </div>
      </main>
        </>
    )
}
export default Dashboard;

