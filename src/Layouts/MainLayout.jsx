import '../assets/style/layouts.css'
import '../assets/style/main.css'
import '../assets/style/style.css'
import '../assets/style/components.css'
import '../assets/style/responsive.css'

import { useCallback, useEffect, useRef, useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import SideBar from '../components/layout/SideBar/SideBar'
import Header from '../components/layout/Header/Header'

// Must match the "md" breakpoint in responsive.css
const MOBILE_QUERY = '(max-width: 767px)'
const COLLAPSED_KEY = 'tf.sidebarCollapsed'

const readCollapsed = () => {
    try {
        return localStorage.getItem(COLLAPSED_KEY) === '1'
    } catch {
        return false
    }
}

const useIsMobile = () => {
    const [isMobile, setIsMobile] = useState(() => window.matchMedia(MOBILE_QUERY).matches)
    useEffect(() => {
        const mql = window.matchMedia(MOBILE_QUERY)
        const onChange = (e) => setIsMobile(e.matches)
        mql.addEventListener('change', onChange)
        return () => mql.removeEventListener('change', onChange)
    }, [])
    return isMobile
}

// App shell for every signed-in page: sidebar + header + the routed page.
function MainLayout() {
    const isMobile = useIsMobile()
    const location = useLocation()
    const [mobileOpen, setMobileOpen] = useState(false)
    const [collapsed, setCollapsed] = useState(readCollapsed)
    const menuButtonRef = useRef(null)

    // Any navigation (link, back/forward — every history entry has its own key) closes the drawer.
    // Adjusting state during render (React's documented pattern) instead of an effect.
    const [navKey, setNavKey] = useState(location.key)
    if (navKey !== location.key) {
        setNavKey(location.key)
        setMobileOpen(false)
    }

    // The drawer only exists in the mobile layout; leaving it (rotate / resize) closes it for good
    if (!isMobile && mobileOpen) setMobileOpen(false)
    const drawerOpen = isMobile && mobileOpen

    const openMobileSidebar = () => setMobileOpen(true)

    const closeMobileSidebar = useCallback(() => {
        setMobileOpen(false)
        menuButtonRef.current?.focus()
    }, [])

    const toggleCollapsed = () => {
        setCollapsed((prev) => {
            const next = !prev
            try {
                localStorage.setItem(COLLAPSED_KEY, next ? '1' : '0')
            } catch {
                // storage unavailable (private mode): keep the in-memory state only
            }
            return next
        })
    }

    // While the drawer is open: Esc closes it and the page behind does not scroll
    useEffect(() => {
        if (!drawerOpen) return
        const onKeyDown = (e) => {
            if (e.key === 'Escape') closeMobileSidebar()
        }
        document.addEventListener('keydown', onKeyDown)
        const prevOverflow = document.body.style.overflow
        document.body.style.overflow = 'hidden'
        return () => {
            document.removeEventListener('keydown', onKeyDown)
            document.body.style.overflow = prevOverflow
        }
    }, [drawerOpen, closeMobileSidebar])

    return (
        <div className={`app-shell${drawerOpen ? ' is-sidebar-open' : ''}`}>
            <SideBar
                collapsed={!isMobile && collapsed}
                onToggleCollapsed={toggleCollapsed}
                isMobile={isMobile}
                mobileOpen={drawerOpen}
                onCloseMobile={closeMobileSidebar}
            />
            {drawerOpen && (
                <div className="sidebar-overlay show" onClick={closeMobileSidebar} aria-hidden="true" />
            )}
            <div className="app-main">
                <Header
                    menuButtonRef={menuButtonRef}
                    onOpenSidebar={openMobileSidebar}
                    sidebarOpen={drawerOpen}
                />
                <Outlet />
            </div>
        </div>
    )
}
export default MainLayout;
