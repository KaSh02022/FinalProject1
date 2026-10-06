
function Tasks(){
    return(
    <>
                    <div className="card" data-tab-panel="myTasks" data-tab="all">
                        <button className="task-list-row" onClick={() => {}}>
                        <div className="task-list-title-cell"><div className="task-list-title-top"><span className="priority-badge" style={{ color: '#2563eb', background: '#eff6ff' }}><span className="icon icon-xs" data-icon="arrowDown"></span></span><span className="task-title-text">Prepare capstone presentation</span></div>
                            <div className="task-list-title-sub"><span className="task-list-project-name">TeamFlow Platform</span><span className="task-list-sub-meta"><span className="icon icon-xs" data-icon="checkSquare"></span>0/2</span></div></div>
                        <span className="task-list-column-cell"><span className="project-color-dot" style={{ background: '#94a3b8' }}></span>Todo</span>
                        <span className="task-list-assignee-cell"><span className="avatar avatar-sm" style={{ background: '#4f46e5' }}>CS</span></span>
                        <span className="task-list-extra-labels"></span>
                        <span className="task-list-due-cell">Sep 14</span>
                        </button>
                        <button className="task-list-row" onClick={() => {}}>
                        <div className="task-list-title-cell"><div className="task-list-title-top"><span className="priority-badge" style={{ color: '#f97316', background: '#fff7ed' }}><span className="icon icon-xs" data-icon="arrowUp"></span></span><span className="task-title-text">Task detail drawer</span></div>
                            <div className="task-list-title-sub"><span className="task-list-project-name">TeamFlow Platform</span><span className="task-list-sub-meta"><span className="icon icon-xs" data-icon="checkSquare"></span>5/5</span><span className="task-list-sub-meta"><span className="icon icon-xs" data-icon="messageSquare"></span>4</span></div></div>
                        <span className="task-list-column-cell"><span className="project-color-dot" style={{ background: '#9333ea' }}></span>Review</span>
                        <span className="task-list-assignee-cell"><span className="avatar avatar-sm" style={{ background: '#4f46e5' }}>CS</span></span>
                        <span className="task-list-extra-labels"></span>
                        <span className="task-list-due-cell due-overdue">Aug 25</span>
                        </button>
                        <button className="task-list-row" onClick={() => {}}>
                        <div className="task-list-title-cell"><div className="task-list-title-top"><span className="priority-badge" style={{ color: '#2563eb', background: '#eff6ff' }}><span className="icon icon-xs" data-icon="arrowDown"></span></span><span className="task-title-text">Write documentation</span></div>
                            <div className="task-list-title-sub"><span className="task-list-project-name">TeamFlow Platform</span><span className="task-list-sub-meta"><span className="icon icon-xs" data-icon="checkSquare"></span>3/3</span><span className="task-list-sub-meta"><span className="icon icon-xs" data-icon="messageSquare"></span>2</span></div></div>
                        <span className="task-list-column-cell"><span className="project-color-dot" style={{ background: '#16a34a' }}></span>Done</span>
                        <span className="task-list-assignee-cell"><span className="avatar avatar-sm" style={{ background: '#4f46e5' }}>CS</span></span>
                        <span className="task-list-extra-labels"></span>
                        <span className="task-list-due-cell">Aug 20</span>
                        </button>
                        <button className="task-list-row" onClick={() => {}}>
                        <div className="task-list-title-cell"><div className="task-list-title-top"><span className="priority-badge" style={{ color: '#f59e0b', background: '#fffbeb' }}><span className="icon icon-xs" data-icon="minus"></span></span><span className="task-title-text">User research interviews</span></div>
                    <div className="task-list-title-sub"><span className="task-list-project-name">TeamFlow Platform</span><span className="task-list-sub-meta"><span className="icon icon-xs" data-icon="checkSquare"></span>5/5</span><span className="task-list-sub-meta"><span className="icon icon-xs" data-icon="messageSquare"></span>3</span></div></div>
                        <span className="task-list-column-cell"><span className="project-color-dot" style={{ background: '#16a34a' }}></span>Done</span>
                        <span className="task-list-assignee-cell"><span className="avatar avatar-sm" style={{ background: '#4f46e5' }}>CS</span></span>
                        <span className="task-list-extra-labels"></span>
                        <span className="task-list-due-cell">Aug 10</span>
                        </button>
                    </div>
                    
        
    </>
    )
}
export default Tasks;