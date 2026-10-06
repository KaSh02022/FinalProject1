import { useEffect } from 'react'
import { Route, Routes, useNavigate } from 'react-router-dom'
import { socket } from './utils/socket' // Đảm bảo đúng đường dẫn file socket.js của bạn

import './App.css'
import MainLayout from './Layouts/MainLayout'
import Dashboard from './pages/Dashboard/Dasboard'
import Project from './pages/Project/Project'
import Login from './pages/Login/Login'
import ProjectBoard from "./pages/Project/ProjectBoard.jsx";
import MyTasks from './pages/MyTasks/MyTasks.jsx'
import AdminUsers from './pages/AdminUsers/AdminUsers.jsx'
import ProjectList from "./pages/Project/ProjectList.jsx";
import ProjectCalendar from "./pages/Project/ProjectCalendar.jsx";
import ProjectSetting from "./pages/Project/ProjectSetting.jsx";
import Register from './pages/Register/Register.jsx'
import ForgetPassword from './pages/ForgetPassword/ForgetPassword.jsx'
import ResetPassword from './pages/ForgetPassword/ResetPassword/ResetPassword.jsx'
import ProjectOverview from "./pages/Project/ProjectOverview.jsx";
import ProjectChart from "./pages/Project/ProjectChart.jsx";

function App() {
    const navigate = useNavigate();

    useEffect(() => {
        // Lắng nghe tín hiệu ban từ Socket
        const handleUserBanned = (data) => {
            // Lấy user hiện tại trong localStorage NGAY KHI CÓ SỰ KIỆN BẮN VỀ
            const currentUser = JSON.parse(localStorage.getItem("user") || "{}");
            const currentUserId = currentUser._id || currentUser.id;

            // Nếu user đăng nhập trùng khớp với userId bị ban
            if (currentUserId && currentUserId === data.userId) {
                alert("Tài khoản của bạn đã bị vô hiệu hóa bởi Quản trị viên.");

                // Xóa thông tin đăng nhập
                localStorage.removeItem("user");
                localStorage.removeItem("token");

                // Điều hướng về Login
                navigate("/login", { replace: true });
            }
        };

        socket.on("user_banned", handleUserBanned);

        return () => {
            socket.off("user_banned", handleUserBanned);
        };
    }, [navigate]);

    return (
        <>
            <Routes>
                <Route index element={<Login/>}/>
                <Route element={<MainLayout/>}>
                    <Route path='/dashboard' element ={<Dashboard/>}/>
                    <Route path='/myTasks' element ={<MyTasks/>}/>
                    <Route path='/adminuser' element ={<AdminUsers/>}/>
                </Route>
                <Route path = "/project" element={<Project/>}/>
                <Route path = "/login" element={<Login/>}/>
                <Route path = "/register" element={<Register/>}/>
                <Route path = "/forgot" element={<ForgetPassword/>}/>
                <Route path = "/resetPassword" element={<ResetPassword/>}/>
                <Route path="/projectboard/:id" element={<ProjectBoard />} />
                <Route path = "/projectlist/:id" element = {<ProjectList/>}/>
                <Route path = "/projectcalendar/:id" element = {<ProjectCalendar/>}/>
                <Route path = "/projectsetting/:id" element = {<ProjectSetting/>}/>
                <Route path = "/projectoverview/:id" element = {<ProjectOverview/>}/>
                <Route path = "/projectchart/:id" element = {<ProjectChart/>}/>
            </Routes>
        </>
    )
}

export default App;