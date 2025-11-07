import React, { useState } from "react";
import axios from "axios";
import "./AdminRegister.css";
import api from "../../api/axiosInstence";

const AdminRegister = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const API_URL = `${import.meta.env.VITE_APP_BACKEND_URL}/auth/admin-register`;

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    // Basic frontend validation
    if (!formData.email || !formData.password) {
      setMessage("❌ Please fill out all required fields.");
      setLoading(false);
      return;
    }

    if (formData.phone && !/^[6-9]\d{9}$/.test(formData.phone)) {
      setMessage("❌ Invalid phone number format.");
      setLoading(false);
      return;
    }

    try {
      const res = await axios.post(API_URL, formData);
      setMessage(`✅ ${res.data.message}`);
      setFormData({ name: "", email: "", phone: "", password: "" });
    } catch (err) {
      console.error(err);
      setMessage(
        `❌ ${err.response?.data?.detail || err.message || "Something went wrong."}`
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-register-container">
      <div className="admin-register-card">
        <h2>Admin Registration</h2>
        <form onSubmit={handleSubmit}>
          <label>Name</label>
          <input
            type="text"
            name="name"
            placeholder="Enter name"
            value={formData.name}
            onChange={handleChange}
          />

          <label>Email</label>
          <input
            type="email"
            name="email"
            placeholder="Enter email"
            value={formData.email}
            onChange={handleChange}
            required
          />

          <label>Phone</label>
          <input
            type="text"
            name="phone"
            placeholder="Enter phone (optional)"
            value={formData.phone}
            onChange={handleChange}
          />

          <label>Password</label>
          <input
            type="password"
            name="password"
            placeholder="Enter password"
            value={formData.password}
            onChange={handleChange}
            required
          />

          <button type="submit" disabled={loading}>
            {loading ? "Registering..." : "Register"}
          </button>
        </form>

        {message && <p className="message">{message}</p>}
      </div>
    </div>
  );
};

export default AdminRegister;
