function TodayTask(){
    return(
    <>
       <div class="card panel">
              <h2 class="panel-title">Today's Tasks</h2>
              <div class="panel-list">
                <a href="project-board.html?task=p1-t9" class="panel-row">
                  <span class="priority-badge" style={{color:'#dc2626', background:'#fef2f2'}}><span class="icon icon-xs" data-icon="chevronsUp">
                    <svg viewBox="0 0 24 24"><path d="m17 11-5-5-5 5"></path><path d="m17 18-5-5-5 5"></path></svg>
                    </span>Urgent</span>
                  <span class="panel-row-title">Kanban drag &amp; drop</span>
                  <span class="panel-row-meta">TeamFlow Platform</span>
                </a>
                <a href="project-board.html?task=p1-t6" class="panel-row">
                  <span class="priority-badge" style={{color:'#f97316', background:'#fff7ed'}}><span class="icon icon-xs" data-icon="arrowUp">
                    <svg viewBox="0 0 24 24"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>
                    </span>High</span>
                  <span class="panel-row-title">Build dashboard UI</span>
                  <span class="panel-row-meta">TeamFlow Platform</span>
                </a>
                <a href="project-board.html?task=p1-t5" class="panel-row">
                  <span class="priority-badge" style={{color:'#f97316', background:'#fff7ed'}}><span class="icon icon-xs" data-icon="arrowUp">
                    <svg viewBox="0 0 24 24"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>
                    </span>High</span>
                  <span class="panel-row-title">Implement login API</span>
                  <span class="panel-row-meta">TeamFlow Platform</span>
                </a>
              </div>
        </div>
    </>
    )
}
export default TodayTask;