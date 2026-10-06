import '../assets/style/layouts.css'
import '../assets/style/main.css'
import '../assets/style/style.css'
import '../assets/style/components.css'
import '../assets/style/responsive.css'

import SideBar from '../components/layout/SideBar/SideBar'
import Header from '../components/layout/Header/Header'
import { Outlet } from 'react-router-dom'
function MainLayout(){
    return(
        <>
         <div class="app-shell">
            <SideBar/>
            <div class="app-main">
                <Header/>
                <Outlet/>
            </div>
         </div>
        </>
    )
}
export default MainLayout;