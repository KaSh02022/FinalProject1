import Nav from "./Nav/Nav";

function SideBar() {
    return (
        <aside className="sidebar">
            <div className="sidebar-brand">
        <span className="sidebar-brand-logo icon" data-icon="kanbanSquare">
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" fill="none" strokeWidth="2">
            <rect width="18" height="18" x="3" y="3" rx="2"></rect>
            <path d="M8 7v7"></path>
            <path d="M12 7v4"></path>
            <path d="M16 7v9"></path>
          </svg>
        </span>
                <span className="sidebar-brand-name">TeamFlow</span>
            </div>

            <div className="sidebar-workspace">
                <p className="sidebar-workspace-label">WORK SPACE</p>
                <p className="sidebar-workspace-name">Nang Cao Team</p>
            </div>

            <Nav />

        </aside>
    );
}

export default SideBar;