import { Target, Eye, EyeOff } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { API_BASE_URL, translateBackendMessage } from "../../config/apiConfig.js";
import { notify } from "../../utils/notify.js";

function Register() {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    role: "User"
  });

  // State quản lý ẩn/hiện mật khẩu
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  function handleChange(e) {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      notify({ type: "error", title: "The passwords do not match." });
      return;
    }
    try {
      const res = await fetch(`${API_BASE_URL}/user/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        // Đăng ký thành công -> Chuyển hướng sang trang Login
        navigate("/login");
      } else {
        notify({ type: "error", title: "Registration failed", message: translateBackendMessage(data.message) });
      }
    } catch (error) {
      console.log(error);
    }
  }

  return (
      <div className="auth-wrap size-lg">
        <div className="auth-brand-row">
        <span className="icon icon-xl auth-logo" data-icon="kanbanSquare">
          <svg viewBox="0 0 24 24">
            <rect width="18" height="18" x="3" y="3" rx="2"></rect>
            <path d="M8 7v7"></path>
            <path d="M12 7v4"></path>
            <path d="M16 7v9"></path>
          </svg>
        </span>
          <div>
            <h1>Create your account</h1>
            <p className="page-subtitle">It only takes a minute to get started with TeamFlow.</p>
          </div>
        </div>

        <div className="card auth-card">
          <div className="social-row">
            <button type="button" className="btn btn-outline social-btn" data-social="google">
              <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
                <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.9 32.6 29.4 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 6.1 29.5 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.7-.4-3.5z"></path>
                <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.5 7.1 29.5 5 24 5c-7.7 0-14.4 4.3-17.7 10.7z"></path>
                <path fill="#4CAF50" d="M24 44c5.3 0 10.1-2 13.7-5.4l-6.3-5.2C29.4 35.6 26.8 36.5 24 36.5c-5.4 0-9.9-3.4-11.5-8.1l-6.5 5C9.5 39.6 16.2 44 24 44z"></path>
                <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1 3-3.2 5.5-6 7l6.3 5.2C39.9 38 44 32 44 24c0-1.3-.1-2.7-.4-3.5z"></path>
              </svg>
              Google
            </button>
            <button type="button" className="btn btn-outline social-btn" data-social="facebook">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877F2" aria-hidden="true">
                <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.313 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"></path>
              </svg>
              Facebook
            </button>
          </div>

          <div className="auth-divider"><span></span><p>or sign up with email</p><span></span></div>

          <form id="registerForm" noValidate="" onSubmit={handleSubmit}>
            <div className="field">
              <label className="field-label" htmlFor="UserName">UserName</label>
              <input className="input" type="text" id="UserName" name="username" onChange={handleChange} placeholder="Your Name" autoComplete="username" required="" />
              <p className="field-error hidden" data-error-for="registerEmail"></p>
            </div>

            <div className="field">
              <label className="field-label" htmlFor="registerEmail">Email</label>
              <input className="input" type="email" id="registerEmail" name="email" onChange={handleChange} placeholder="you@teamflow.dev" autoComplete="email" required="" />
              <p className="field-error hidden" data-error-for="registerEmail"></p>
            </div>

            {/* Password */}
            <div className="field">
              <label className="field-label" htmlFor="registerPassword">Password</label>
              <div className="password-field-wrap">
                <input
                    className="input"
                    type={showPassword ? "text" : "password"}
                    id="registerPassword"
                    value={formData.password}
                    onChange={handleChange}
                    name="password"
                    placeholder="At least 8 characters"
                    autoComplete="new-password"
                    required=""
                />
                <button
                    type="button"
                    className="password-toggle-btn icon-btn icon-btn-sm"
                    onClick={() => setShowPassword(!showPassword)}
                    aria-label="Toggle password visibility"
                >
                <span className="icon icon-sm">
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </span>
                </button>
              </div>
              <p className="field-error hidden" data-error-for="registerPassword"></p>
            </div>

            {/* Confirm Password */}
            <div className="field">
              <label className="field-label" htmlFor="confirmPassword">Confirm password</label>
              <div className="password-field-wrap">
                <input
                    className="input"
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleChange}
                    name="confirmPassword"
                    placeholder="Re-enter your password"
                    autoComplete="new-password"
                    required=""
                />
                <button
                    type="button"
                    className="password-toggle-btn icon-btn icon-btn-sm"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    aria-label="Toggle confirm password visibility"
                >
                <span className="icon icon-sm">
                  {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </span>
                </button>
              </div>
              <p className="field-error hidden" data-error-for="confirmPassword"></p>
            </div>

            <button style={{ marginTop: '20px' }} type="submit" className="btn btn-primary btn-full">Sign up</button>
          </form>
        </div>

        <p className="auth-footer-text">Already have an account? <Link to='/login' className="auth-inline-link">Log in</Link></p>
      </div>
  );
}

export default Register;