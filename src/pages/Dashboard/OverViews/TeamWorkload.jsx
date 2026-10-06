function TeamWorkload(){
    return(
    <>
            <div className="card panel">
              <h2 className="panel-title">Team Workload</h2>
              <div className="panel-list">
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="avatar avatar-sm" style={{ background: '#4f46e5' }}>CS</span>
                  <span style={{ width: '88px', flexShrink: 0, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Cao Sơn</span>
                  <span className="progress-bar" style={{ flex: 1 }}><span className="progress-bar-fill" style={{ width: '65%' }}></span></span>
                  <span style={{ width: '36px', flexShrink: 0, textAlign: 'right', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)' }}>65%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="avatar avatar-sm" style={{ background: '#0ea5e9' }}>QL</span>
                  <span style={{ width: '88px', flexShrink: 0, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Quách Loan</span>
                  <span className="progress-bar" style={{ flex: 1 }}><span className="progress-bar-fill" style={{ width: '80%' }}></span></span>
                  <span style={{ width: '36px', flexShrink: 0, textAlign: 'right', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)' }}>80%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="avatar avatar-sm" style={{ background: '#16a34a' }}>NL</span>
                  <span style={{ width: '88px', flexShrink: 0, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Ngô Lâm</span>
                  <span className="progress-bar" style={{ flex: 1 }}><span className="progress-bar-fill" style={{ width: '90%' }}></span></span>
                  <span style={{ width: '36px', flexShrink: 0, textAlign: 'right', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)' }}>90%</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span className="avatar avatar-sm" style={{ background: '#db2777' }}>KN</span>
                  <span style={{ width: '88px', flexShrink: 0, fontSize: '14px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>Khánh Ngọc</span>
                  <span className="progress-bar" style={{ flex: 1 }}><span className="progress-bar-fill" style={{ width: '55%' }}></span></span>
                  <span style={{ width: '36px', flexShrink: 0, textAlign: 'right', fontSize: '12px', fontWeight: 500, color: 'var(--color-text-muted)' }}>55%</span>
                </div>
              </div>
            </div>
    </>
    )
}
export default TeamWorkload;