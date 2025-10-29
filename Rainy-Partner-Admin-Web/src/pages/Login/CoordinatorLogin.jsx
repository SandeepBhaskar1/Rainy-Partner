import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const CoordinatorLogin = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const navigate = useNavigate();

  const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      const res = await axios.post(`${BACKEND_URL}/auth/coordinator-login`, {
        identifier,
        password,
      });

      const { token, coordinator, message } = res.data;

      if (token) {
        localStorage.setItem("authToken", token);
        localStorage.setItem("user", JSON.stringify(coordinator));
        navigate("/");
      } else {
        setError(message || "Invalid credentials");
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
                <h2 className="form-title">Welcome Back</h2>
                <p className="form-subtitle">Enter your credentials to access your account</p>
              </div>

              {/* Error Message */}
              {error && (
                <div className="error-message">
                  {error}
                </div>
              )}

              <form onSubmit={handleSubmit}>
                <div className="form-group">
                  <label className="form-label">Email or Phone Number</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Enter your email or phone"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
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

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default CoordinatorLogin;