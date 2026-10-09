import { useState } from "react";
import { KanbanSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL, translateBackendMessage } from "../../../config/apiConfig.js";
import { notify } from "../../../utils/notify.js";

function ResetPassword() {
    const [newPassword, setNewPassword] = useState("");
    const [confirmPassword, setConfirmPassword] = useState("");
    const [passwordError, setPasswordError] = useState("");
    const [confirmError, setConfirmError] = useState("");
    const [loading, setLoading] = useState(false);

    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setPasswordError("");
        setConfirmError("");

        const savedEmail = localStorage.getItem("resetPasswordEmail");
        if (!savedEmail) {
            notify({ type: "info", title: "Your session has expired. Please enter your email again." });
            navigate('/forgot'); 
            return;
        }

        let hasError = false;
        if (!newPassword) {
            setPasswordError("New password is required.");
            hasError = true;
        } else if (newPassword.length < 6) {
            setPasswordError("Password must be at least 6 characters.");
            hasError = true;
        }

        if (!confirmPassword) {
            setConfirmError("Please confirm your password.");
            hasError = true;
        } else if (newPassword !== confirmPassword) {
            setConfirmError("Passwords do not match!");
            hasError = true;
        }

        if (hasError) return;

        try {
            setLoading(true);
            const res = await fetch(`${API_BASE_URL}/user/reset-password`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    email: savedEmail,
                    newPassword: newPassword
                })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(translateBackendMessage(data.message) || "Failed to reset password.");
            }

            notify({ type: "success", title: "Your password has been changed." });
            
            localStorage.removeItem("resetPasswordEmail");
            navigate('/Login');

        } catch (error) {
            console.error("Lỗi đặt lại mật khẩu:", error);
            setPasswordError(error.message || "Something went wrong. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <main className="auth-page">
                <div className="auth-wrap size-lg">
                    <div className="auth-brand-row">
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
                                <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Reset Password</h1>
                                <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Enter new password.</p>
                            </div>
                        </div>
                    </div>

                    <form id="resetPasswordForm" onSubmit={handleSubmit} noValidate>
                        <div className="field">
                            <label className="field-label" htmlFor="newPassword">
                                New Password
                            </label>

                            <input
                                className="input"
                                type="password"
                                id="newPassword"
                                name="newPassword"
                                placeholder="Enter your new password"
                                autoComplete="new-password"
                                value={newPassword}
                                onChange={(e) => setNewPassword(e.target.value)}
                                required
                            />

                            {passwordError && (
                                <p className="field-error" data-error-for="newPassword">
                                    {passwordError}
                                </p>
                            )}
                        </div>

                        {/* Ô xác nhận lại mật khẩu */}
                        <div className="field">
                            <label className="field-label" htmlFor="confirmPassword">
                                Confirm Password
                            </label>

                            <input
                                className="input"
                                type="password"
                                id="confirmPassword"
                                name="confirmPassword"
                                placeholder="Re-enter your new password"
                                autoComplete="new-password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                            />

                            {confirmError && (
                                <p className="field-error" data-error-for="confirmPassword">
                                    {confirmError}
                                </p>
                            )}
                        </div>

                        <button
                            type="submit"
                            className="btn btn-primary btn-full"
                            style={{ marginTop: '20px' }}
                            disabled={loading}
                        >
                            {loading ? "Resetting..." : "Reset Password"}
                        </button>

                    </form>
                </div>
            </main>
        </>
    );
}

export default ResetPassword;