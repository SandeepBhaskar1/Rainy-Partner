import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(`${BACKEND_URL}/auth/admin-login`, {
        email,
        password,
      });

      if (res.data.success) {
        const { token, admin } = res.data;
        localStorage.setItem("authToken", token);
        localStorage.setItem("user", JSON.stringify(admin));
        navigate("/");
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message || "Login failed. Please try again."
      );
    }
  };

  const handleForgotPassword = (e) => {
    e.preventDefault();
    navigate('/forgot-password');
  };

  return (
    <div className="login-page-wrapper">
      <div className="background-image"></div>
      
      <div className="background-overlay"></div>

      <div className="login-main-container">
        <div className="login-grid">
          

          {/* Right Side - Login Form with Blur Container */}
          <div className="login-form-wrapper">
            <div className="login-blur-container">
            

              <div className="form-header">
                <h2 className="form-title">Admin Login</h2>
                <p className="form-subtitle">Enter your credentials to access the admin dashboard</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    type="email"
                    className="form-input"
                    placeholder="Enter your email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Password</label>
                  <input
                    type="password"
                    className="form-input"
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>

                <div className="forgot-password">
                  <a href="#" onClick={handleForgotPassword}>Forgot password?</a>
                </div>

                <button type="submit" className="login-button">
                  Sign In
                </button>
              </form>

              <div className="divider">
                <span>Admin Access Only</span>
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default Login;