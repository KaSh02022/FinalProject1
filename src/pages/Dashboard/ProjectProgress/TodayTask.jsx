function TodayTask(){
    return(
    <>
       <div className="card panel">
              <h2 className="panel-title">Today's Tasks</h2>
              <div className="panel-list">
                <a href="project-board.html?task=p1-t9" className="panel-row">
                  <span className="priority-badge" style={{color:'#dc2626', background:'#fef2f2'}}><span className="icon icon-xs" data-icon="chevronsUp">
                    <svg viewBox="0 0 24 24"><path d="m17 11-5-5-5 5"></path><path d="m17 18-5-5-5 5"></path></svg>
                    </span>Urgent</span>
                  <span className="panel-row-title">Kanban drag &amp; drop</span>
                  <span className="panel-row-meta">TeamFlow Platform</span>
                </a>
                <a href="project-board.html?task=p1-t6" className="panel-row">
                  <span className="priority-badge" style={{color:'#f97316', background:'#fff7ed'}}><span className="icon icon-xs" data-icon="arrowUp">
                    <svg viewBox="0 0 24 24"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>
                    </span>High</span>
                  <span className="panel-row-title">Build dashboard UI</span>
                  <span className="panel-row-meta">TeamFlow Platform</span>
                </a>
                <a href="project-board.html?task=p1-t5" className="panel-row">
                  <span className="priority-badge" style={{color:'#f97316', background:'#fff7ed'}}><span className="icon icon-xs" data-icon="arrowUp">
                    <svg viewBox="0 0 24 24"><path d="m5 12 7-7 7 7"></path><path d="M12 19V5"></path></svg>
                    </span>High</span>
                  <span className="panel-row-title">Implement login API</span>
                  <span className="panel-row-meta">TeamFlow Platform</span>
                </a>
              </div>
        </div>
    </>
    )
}
export default TodayTask;