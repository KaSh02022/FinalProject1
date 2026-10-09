
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KanbanSquare, ArrowRight, Lock, Mail } from 'lucide-react';
import { API_BASE_URL, translateBackendMessage } from "../../config/apiConfig.js";

const DEMO_USERS = [
    { name: 'Cao Sơn', role: 'Team Leader', initials: 'CS', color: '#4f46e5', email: 'cason@teamflow.dev' },
    { name: 'Quách Loan', role: 'Member', initials: 'QL', color: '#0ea5e9', email: 'quachloan@teamflow.dev' },
    { name: 'Ngô Lâm', role: 'Member', initials: 'NL', color: '#16a34a', email: 'ngolam@teamflow.dev' },
    { name: 'Khánh Ngọc', role: 'System Admin', initials: 'KN', color: '#db2777', email: 'khanhngoc@teamflow.dev' },
];

export default function LoginPage() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [errorMessage, setErrorMessage] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        setEmail("");
        setPassword("");
    },[]);

    const handleFormSubmit = async (e) => {
        e.preventDefault();
        setErrorMessage('');
        setIsLoading(true);

        try {
            const response = await fetch(`${API_BASE_URL}/user/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // Lưu token JWT và thông tin user vào localStorage
                localStorage.setItem('token', data.token);
                localStorage.setItem('user', JSON.stringify(data.user));

                // Chuyển hướng tới trang Dashboard
                navigate('/dashboard');
            } else {
                // Hiển thị thông báo lỗi từ server (Ví dụ: 'email or password not available')
                setErrorMessage(translateBackendMessage(data.message || data.error) || 'Sign-in failed.');
            }
        } catch (error) {
            setErrorMessage('Could not reach the server. Check that the backend is running.');
        } finally {
            setIsLoading(false);
        }
    };

    // Tự động điền dữ liệu khi chọn Demo Account
    const handleDemoSelect = (demoEmail) => {
        setEmail(demoEmail);
        setPassword('123456'); // Mật khẩu demo mặc định
    };

    return (
        <main style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px' }}>
            <div style={{ width: '100%', maxWidth: '384px' }}>

                {/* Header */}
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', textAlign: 'center', marginBottom: '24px' }}>
          <span
              style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  background: '#4f46e5',
                  color: '#fff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
              }}
          >
            <KanbanSquare size={24} />
          </span>
                    <div>
                        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Welcome to TeamFlow</h1>
                        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Sign in to your workspace to continue.</p>
                    </div>
                </div>

                {/* Form Đăng nhập */}
                <form
                    className="card"
                    style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px', borderRadius: '8px', border: '1px solid #e5e7eb', background: '#fff' }}
                    onSubmit={handleFormSubmit}
                >
                    {/* Ô nhập Email */}
                    <div className="field">
                        <label className="field-label" htmlFor="email" style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                            Email
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="input"
                                type="email"
                                id="email"
                                placeholder="you@teamflow.dev"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                            />
                        </div>
                    </div>

                    {/* Ô nhập Password */}
                    <div className="field">
                        <label className="field-label" htmlFor="password" style={{ display: 'block', fontSize: '14px', fontWeight: 500, marginBottom: '6px' }}>
                            Password
                        </label>
                        <div style={{ position: 'relative' }}>
                            <input
                                className="input"
                                type="password"
                                id="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #d1d5db' }}
                            />
                        </div>
                    </div>

                    {/* Thông báo lỗi */}
                    {errorMessage && (
                        <div style={{ color: '#dc2626', backgroundColor: '#fef2f2', padding: '8px 12px', borderRadius: '6px', fontSize: '13px' }}>
                            {errorMessage}
                        </div>
                    )}

                    {/* Nút Submit */}
                    <button
                        type="submit"
                        disabled={isLoading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '8px',
                            padding: '10px',
                            backgroundColor: '#4f46e5',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            opacity: isLoading ? 0.7 : 1
                        }}
                    >
                        {isLoading ? 'Loading...' : 'Continue'}
                        {!isLoading && <ArrowRight size={16} />}
                    </button>
                </form>

                <p className="auth-footer-text"  style={{ textAlign: "center", fontSize: "14px", color: "#6b7280" }}>Don't have an account?{" "}
                    <Link  to='/register'  className="auth-inline-link" style={{ color: "var(--color-primary-600)", fontWeight: 500, textDecoration: "none" }}> Sign up</Link>

                </p>  
                  <p className="auth-footer-text"  style={{ textAlign: "center", fontSize: "14px", color: "#6b7280" }}>
                    <Link  to='/forgot'  className="auth-inline-link" style={{ color: "var(--color-primary-600)", fontWeight: 500, textDecoration: "none" }}> Forgot Password ?</Link>
                </p>  
                <div style={{ marginTop: '24px' }}>
             

                    <p style={{ textAlign: 'center', marginBottom: '8px', fontSize: '12px', fontWeight: 500, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '.04em' }}>
                        Or continue as a demo account
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {DEMO_USERS.map((user) => (
                            <button
                                key={user.name}
                                type="button"
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    padding: '10px 12px',
                                    textAlign: 'left',
                                    cursor: 'pointer',
                                    border: '1px solid #e5e7eb',
                                    borderRadius: '6px',
                                    background: '#fff'
                                }}
                                onClick={() => handleDemoSelect(user.email)}
                            >
                <span style={{ width: '32px', height: '32px', borderRadius: '50%', background: user.color, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 600 }}>
                  {user.initials}
                </span>
                                <span style={{ flex: 1 }}>
                  <span style={{ display: 'block', fontSize: '14px', fontWeight: 500, color: '#111827' }}>
                    {user.name}
                  </span>
                  <span style={{ display: 'block', fontSize: '12px', color: '#6b7280' }}>
                    {user.role} ({user.email})
                  </span>
                </span>
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </main>
    );
}