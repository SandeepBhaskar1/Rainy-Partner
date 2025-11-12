import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import "./Login.css";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { setUser } = useAuth();

  const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const res = await axios.post(`${BACKEND_URL}/auth/admin-login`, {
        email,
        password,
      }, {
        withCredentials: true
      });

      console.log("Login response:", res.data);

      if (res.data.success) {
        const userData = res.data.admin;
        
        sessionStorage.setItem("user", JSON.stringify(userData));
        
        setUser(userData);
        
        navigate("/");
      } else {
        setError("Invalid credentials");
      }
    } catch (err) {
      console.error("Login error:", err);
      setError(
        err.response?.data?.detail || 
        err.response?.data?.message || 
        "Invalid Credentials."
      );
    } finally {
      setIsLoading(false);
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
          <div className="login-form-wrapper">
            <div className="login-blur-container">
              <div className="form-header">
                <h2 className="form-title">Admin Login</h2>
                <p className="form-subtitle">Enter your credentials to access the admin dashboard</p>
              </div>

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
                    disabled={isLoading}
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
                    disabled={isLoading}
                  />
                </div>

                <div className="forgot-password">
                  <a href="#" onClick={handleForgotPassword}>Forgot password?</a>
                </div>

                <button 
                  type="submit" 
                  className="login-button"
                  disabled={isLoading}
                >
                  {isLoading ? "Signing In..." : "Sign In"}
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