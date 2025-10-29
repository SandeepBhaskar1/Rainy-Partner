import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import "./Login.css";

const ForgotPassword = () => {
  const [step, setStep] = useState(1); // 1 = phone input, 2 = OTP verify, 3 = reset password
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState(""); // "success" or "error"
  const [resending, setResending] = useState(false);

  const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL;
  const navigate = useNavigate();

  // Step 1: Send OTP
  const handleSendOTP = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await axios.post(`${BACKEND_URL}/coordinator/reset-password-otp`, { phone });
      setMessage(res.data.message || "OTP sent successfully!");
      setMessageType("success");
      setStep(2);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to send OTP. Please try again.");
      setMessageType("error");
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOTP = async (e) => {
    e.preventDefault();
    setMessage("");

    try {
      const res = await axios.post(`${BACKEND_URL}/coordinator/verify-reset-otp`, { phone, otp });
      setMessage(res.data.message || "OTP verified successfully!");
      setMessageType("success");
      setStep(3);
    } catch (err) {
      setMessage(err.response?.data?.message || "Invalid or expired OTP.");
      setMessageType("error");
    }
  };

  // Resend OTP
  const handleResendOTP = async () => {
    setResending(true);
    setMessage("");
    try {
      const res = await axios.post(`${BACKEND_URL}/coordinator/reset-password-otp`, { phone });
      setMessage(res.data.message || "OTP resent successfully!");
      setMessageType("success");
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to resend OTP. Try again.");
      setMessageType("error");
    } finally {
      setResending(false);
    }
  };

  // Step 3: Reset Password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setMessage("");

    if (newPassword !== confirmPassword) {
      setMessage("Passwords do not match!");
      setMessageType("error");
      return;
    }

    try {
      const res = await axios.post(`${BACKEND_URL}/coordinator/reset-password`, {
        phone,
        otp,
        newPassword,
        confirmPassword,
      });

      setMessage(res.data.message || "Password reset successfully!");
      setMessageType("success");

      // Redirect to login after a short delay
      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setMessage(err.response?.data?.message || "Failed to reset password.");
      setMessageType("error");
    }
  };

  const getStepTitle = () => {
    switch (step) {
      case 1:
        return "Forgot Password?";
      case 2:
        return "Verify OTP";
      case 3:
        return "Create New Password";
      default:
        return "Reset Password";
    }
  };

  const getStepSubtitle = () => {
    switch (step) {
      case 1:
        return "Enter your phone number to receive an OTP";
      case 2:
        return "Enter the OTP sent to your phone";
      case 3:
        return "Create a strong password for your account";
      default:
        return "";
    }
  };

  return (
    <div className="login-page-wrapper">
      <div className="background-image"></div>
      
      <div className="background-overlay"></div>

      <div className="login-main-container">
        <div className="login-grid">
        

          {/* Right Side - Form with Blur Container */}
          <div className="login-form-wrapper">
            <div className="login-blur-container">

              <div className="form-header">
                <h2 className="form-title">{getStepTitle()}</h2>
                <p className="form-subtitle">{getStepSubtitle()}</p>
              </div>

              {/* Message Display */}
              {message && (
                <div className={messageType === "success" ? "success-message" : "error-message"}>
                  {message}
                </div>
              )}

              {/* Step 1: Phone Input */}
              {step === 1 && (
                <form onSubmit={handleSendOTP}>
                  <div className="form-group">
                    <label className="form-label">Phone Number</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Enter your phone number"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="login-button">
                    Send OTP
                  </button>

                  <div className="support-text" style={{ marginTop: "20px" }}>
                    Remember your password? <a href="#" onClick={() => navigate("/login")}>Sign In</a>
                  </div>
                </form>
              )}

              {/* Step 2: OTP Verification */}
              {step === 2 && (
                <>
                  <form onSubmit={handleVerifyOTP}>
                    <div className="form-group">
                      <label className="form-label">Enter OTP</label>
                      <input
                        type="text"
                        className="form-input"
                        placeholder="Enter 6-digit OTP"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength="6"
                        required
                      />
                    </div>

                    <button type="submit" className="login-button">
                      Verify OTP
                    </button>
                  </form>

                  <div className="divider">
                    <span>Need help?</span>
                  </div>

                  <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                    <button
                      type="button"
                      onClick={handleResendOTP}
                      className="login-button"
                      style={{ 
                        background: "rgba(255, 255, 255, 0.2)",
                        boxShadow: "none"
                      }}
                      disabled={resending}
                    >
                      {resending ? "Resending..." : "Resend OTP"}
                    </button>

                    <button
                      type="button"
                      onClick={() => navigate("/login")}
                      className="login-button"
                      style={{ 
                        background: "rgba(255, 255, 255, 0.2)",
                        boxShadow: "none"
                      }}
                    >
                      Go Back
                    </button>
                  </div>
                </>
              )}

              {/* Step 3: Reset Password */}
              {step === 3 && (
                <form onSubmit={handleResetPassword}>
                  <div className="form-group">
                    <label className="form-label">New Password</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Enter new password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label className="form-label">Confirm Password</label>
                    <input
                      type="password"
                      className="form-input"
                      placeholder="Confirm new password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                    />
                  </div>

                  <button type="submit" className="login-button">
                    Reset Password
                  </button>
                </form>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;