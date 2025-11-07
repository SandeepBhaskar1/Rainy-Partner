import React, { useState, useEffect } from "react";
import axios from "axios";
import "./CoOrdinators.css";
import { Loader } from "lucide-react";
import api from "../../api/axiosInstence";
const CoOrdinators = () => {
  const [showModal, setShowModal] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    password: "",
  });
  const [coordinators, setCoordinators] = useState([]);
  const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL;

  const fetchCoordinators = async () => {
    try {
      setLoading(true)
      const res = await api.get(`/admin/co-ordinators`, {
        withCredentials: true,
      });
      setCoordinators(res.data.coordinators || []);
    } catch (err) {
      console.error("Error fetching coordinators:", err);
    } finally {
      setLoading(false)
    }
  };

  useEffect(() => {
    fetchCoordinators();
  }, []);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await api.post(
        `/admin/co-ordinator-registeration`,
        formData,
      );

      alert(res.data.message || "Coordinator created successfully!");
      setShowModal(false);
      setFormData({ name: "", phone: "", email: "", password: "" });

      fetchCoordinators();
    } catch (err) {
      console.error(err);
      alert(err.response?.data?.error || "Error creating coordinator.");
    }
  };

    if (loading)
      return (
          <div className="loading-spinner">
              <Loader size={32} className="spinner-icon" />
          <p>Loading plumbers...</p>
        </div>
      );

  return (
    <div className="coordinators-page">
    <div className="headers">
      <h2>Coordinators Page</h2>
      <button className="add-btn" onClick={() => setShowModal(true)}>
        Add Coordinator
      </button>
    </div>

      <div className="table-container">
        {coordinators.length > 0 ? (
          <table className="coordinators-table">
            <thead>
              <tr>
                <th>Co-Ordinator ID</th>
                <th>Name</th>
                <th>Phone</th>
                <th>Email</th>
                <th>No. Of Plumbers Assigned</th>
              </tr>
            </thead>
            <tbody>
              {coordinators.map((coord) => (
                <tr key={coord._id}>
                  <td>{coord.user_id}</td>
                  <td>{coord.name}</td>
                  <td>{coord.phone}</td>
                  <td>{coord.email}</td>
                  <td>{coord.assigned_plumbers.length}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="no-data">No coordinators found.</p>
        )}
      </div>

      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container">
            <h3>Add Coordinator</h3>
            <form onSubmit={handleSubmit}>
              <label>Name:</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
              />

              <label>Phone:</label>
              <input
                type="text"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                required
              />

              <label>Email:</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
              />

              <label>Password:</label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleChange}
                required
              />

              <div className="modal-actions">
                <button type="submit" className="submit-btn">
                  Submit
                </button>
                <button
                  type="button"
                  className="cancel-btn"
                  onClick={() => setShowModal(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoOrdinators;
