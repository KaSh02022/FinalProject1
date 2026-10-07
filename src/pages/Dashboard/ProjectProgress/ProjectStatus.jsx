function ProjectStatus(){
    return(
    <>
          <div className="card panel">
              <h2 className="panel-title">Project Progress</h2>
              <div className="panel-list">
                <a href="project-board.html" className="panel-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}><span className="project-color-dot" style={{ background: '#4f46e5' }}></span><span className="panel-row-title">TeamFlow Platform</span></span>
                    <span className="panel-row-meta">4/14</span>
                  </span>
                  <span className="progress-bar"><span className="progress-bar-fill tone-success" style={{ width: '29%' }}></span></span>
                </a>
                <a href="project-board.html" className="panel-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}><span className="project-color-dot" style={{ background: '#0ea5e9' }}></span><span className="panel-row-title">Marketing Website</span></span>
                    <span className="panel-row-meta">3/8</span>
                  </span>
                  <span className="progress-bar"><span className="progress-bar-fill tone-success" style={{ width: '38%' }}></span></span>
                </a>
                <a href="project-board.html" className="panel-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}><span className="project-color-dot" style={{ background: '#f59e0b' }}></span><span className="panel-row-title">Mobile Companion App</span></span>
                    <span className="panel-row-meta">2/7</span>
                  </span>
                  <span className="progress-bar"><span className="progress-bar-fill tone-success" style={{ width: '29%' }}></span></span>
                </a>
                <a href="project-board.html" className="panel-row" style={{ display: 'flex', flexDirection: 'column', alignItems: 'stretch', gap: '6px' }}>
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}><span className="project-color-dot" style={{ background: '#16a34a' }}></span><span className="panel-row-title">Internal Tooling</span></span>
                    <span className="panel-row-meta">5/8</span>
                  </span>
                  <span className="progress-bar"><span className="progress-bar-fill tone-success" style={{ width: '63%' }}></span></span>
                </a>
              </div>
            </div>

      </>
    )
}
export default ProjectStatus;
