import { KanbanSquare } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function ForgetPassword(){
    const [email, setEmail] = useState("");
    const [errorMessage, setErrorMessage] = useState("");
    const [loading, setLoading] = useState(false);
    
    const navigate = useNavigate(); 

    const handleSubmit = async (e) => {
        e.preventDefault(); 
        setErrorMessage(""); 

        if (!email.trim()) {
            setErrorMessage("Vui lòng nhập Email!");
            return;
        }

        try {
            setLoading(true);

            const res = await fetch("http://localhost:3000/api/user/check-email", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ email: email })
            });

            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.message || "Xác thực email thất bại!");
            }

            localStorage.setItem("resetPasswordEmail", email);            
            navigate('/resetPassword'); 

        } catch (error) {
            console.error("Lỗi quên mật khẩu:", error);
            setErrorMessage(error.message || "Không thể kết nối đến máy chủ.");
        } finally {
            setLoading(false);
        }
    } 
    return(
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
                        <h1 style={{ fontSize: '20px', fontWeight: 600, margin: 0 }}>Forget Password</h1>
                        <p style={{ fontSize: '14px', color: '#6b7280', marginTop: '4px' }}>Enter your email to continue.</p>
                    </div>
                </div>
    </div>

    <div className="card auth-card">

        <div className="auth-divider">
            <span></span>
            <p>reset your password</p>
            <span></span>
        </div>

        <form  onSubmit={handleSubmit} id="forgotPasswordForm" noValidate>

            <div className="field">
                <label className="field-label" htmlFor="forgotEmail">
                    Email
                </label>

                <input
                    className="input"
                    type="email"
                    id="forgotEmail"
                    name="forgotEmail"
                    placeholder="Enter your registered email"
                    autoComplete="email"
                    onChange={(e) => setEmail(e.target.value)}
                    required
                />

    {errorMessage && (
        <p className="field-error" data-error-for="forgotEmail">
            {errorMessage}
        </p>
    )}
            </div>

               <button 
                                style={{ marginTop: '20px' }}
                                type="submit"
                                className="btn btn-primary btn-full"
                                disabled={loading}
                            >
                                {loading ? "Checking..." : "Continue"}
                            </button>
        </form>
    </div>

    <p className="auth-footer-text">
        Remember your password?{" "}
        <Link to='/Login' className="auth-inline-link">
            Back to login
        </Link>
    </p>

</div>
</main>




    </>
    )
}
export default ForgetPassword;