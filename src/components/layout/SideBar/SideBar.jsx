import { useEffect, useRef } from "react";
import { ChevronsLeft, ChevronsRight, X } from "lucide-react";
import Nav from "./Nav/Nav";

function SideBar({ collapsed = false, onToggleCollapsed, isMobile = false, mobileOpen = false, onCloseMobile }) {
    const closeButtonRef = useRef(null);

    // Move focus into the drawer when it opens on mobile
    useEffect(() => {
        if (mobileOpen) closeButtonRef.current?.focus();
    }, [mobileOpen]);

    const classes = ["sidebar"];
    if (collapsed) classes.push("collapsed");
    if (mobileOpen) classes.push("mobile-open");

    return (
        <aside
            id="app-sidebar"
            className={classes.join(" ")}
            aria-label="Main navigation"
            // Mobile: modal dialog while open, unreachable (inert) while closed off-screen
            role={isMobile && mobileOpen ? "dialog" : undefined}
            aria-modal={isMobile && mobileOpen ? true : undefined}
            inert={isMobile && !mobileOpen ? true : undefined}
        >
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
                <button
                    ref={closeButtonRef}
                    type="button"
                    className="icon-btn sidebar-close-btn"
                    onClick={onCloseMobile}
                    aria-label="Close menu"
                >
                    <X className="icon" />
                </button>
            </div>

            <div className="sidebar-workspace">
                <p className="sidebar-workspace-label">WORK SPACE</p>
                <p className="sidebar-workspace-name">Nang Cao Team</p>
            </div>

            <Nav />

            {onToggleCollapsed && (
                <div className="sidebar-collapse-btn">
                    <button
                        type="button"
                        onClick={onToggleCollapsed}
                        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                        aria-expanded={!collapsed}
                        aria-controls="app-sidebar"
                        title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
                    >
                        {collapsed ? <ChevronsRight className="icon icon-md" /> : <ChevronsLeft className="icon icon-md" />}
                        <span>Collapse</span>
                    </button>
                </div>
            )}
        </aside>
    );
}

export default SideBar;
