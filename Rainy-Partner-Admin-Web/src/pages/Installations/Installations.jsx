import React, { useState, useEffect } from "react";
import { CirclePlus, X, ClipboardList, MapPin, } from "lucide-react";
import axios from "axios";
import "./Installations.css";

const Installations = () => {
  const [openForm, setOpenForm] = useState(false);
  const [installations, setInstallations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [formData, setFormData] = useState({
    customerName: "",
    contact: "",
    address: "",
    city: "",
    district: "",
    state: "",
    pincode: "",
    model: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL;

  const isFormValid = Object.values(formData).every(
    (value) => value.trim() !== ""
  );

  // Fetch installations on component mount
  useEffect(() => {
    fetchInstallations();
  }, []);

  const fetchInstallations = async () => {
    try {
      const response = await axios.get(`${BACKEND_URL}/post-leads`);
      setInstallations(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching installations:", error);
      setError(true);
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!isFormValid) return;

    setSubmitting(true);

    try {
      const payload = {
        client: {
          name: formData.customerName,
          phone: formData.contact,
          address: formData.address,
          city: formData.city,
          district: formData.district,
          state: formData.state,
          pincode: formData.pincode,
        },
        model_purchased: formData.model,
      };

      const response = await axios.post(`${BACKEND_URL}/post-leads`, payload);

      if (response.status === 201) {
        alert("Installation created successfully!");
        setOpenForm(false);
        setFormData({
          customerName: "",
          contact: "",
          address: "",
          city: "",
          district: "",
          state: "",
          pincode: "",
          model: "",
        });
        // Refresh installations list
        fetchInstallations();
      }
    } catch (error) {
      console.error("Error creating installation:", error);
      alert("Failed to create installation. Please check the console.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = (installationId) => {
    console.log("Assigning installation:", installationId);
    // Add your assign logic here
  };

  const handleApprove = async (installationId) => {
    if (!window.confirm("Are you sure you want to approve this installation?")) {
      return;
    }

    try {
      const response = await axios.patch(
        `${BACKEND_URL}/post-leads/${installationId}`,
        { status: 'completed' }
      );

      if (response.status === 200) {
        alert("Installation approved successfully!");
        fetchInstallations();
      }
    } catch (error) {
      console.error("Error approving installation:", error);
      alert("Failed to approve installation. Please try again.");
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now - date);
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return "Today";
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 30) return `${diffDays} days ago`;

    const diffMonths = Math.floor(diffDays / 30);
    if (diffMonths === 1) return "1 month ago";
    if (diffMonths < 12) return `${diffMonths} months ago`;

    const diffYears = Math.floor(diffMonths / 12);
    return diffYears === 1 ? "1 year ago" : `${diffYears} years ago`;
  };

  return (
    <div className="installations-page">
      <div className="installations-container">
        <div className="installations-header">
          <h2>Installations</h2>
          <button
            className="create-installation-btn"
            onClick={() => setOpenForm(!openForm)}
          >
            <CirclePlus size={18} />
            Create Installation
          </button>
        </div>

        <div className="open-installations-section">
          <div className="section-header">
            <ClipboardList size={20} />
            <h3>Open Installations</h3>
          </div>

          {loading ? (
            <p className="loading-text">Loading installations...</p>
          ) : error ? (
            <p className="error-text">Failed to load installations</p>
          ) : installations.filter(inst => inst.status === 'not-assigned').length === 0 ? (
            <p className="no-data-text">No open installations</p>
          ) : (
            <div className="table-container">
              <table className="installations-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Location</th>
                    <th>Model</th>
                    <th>Created</th>
                    <th>Assign</th>
                  </tr>
                </thead>
                <tbody>
                  {installations
                    .filter(inst => inst.status === 'not-assigned')
                    .map((installation) => (
                    <tr key={installation._id}>
                      <td className="installation-id">{installation._id}</td>
                      <td className="customer-name">{installation.client?.name}</td>
                      <td className="location">
                        {installation.client?.city}, {installation.client?.state}
                      </td>
                      <td className="model">{installation.model_purchased}</td>
                      <td className="created-date">
                        {formatDate(installation.created_at)}
                      </td>
                      <td className="assign-cell">
                        <button
                          className="assign-btn"
                          onClick={() => handleAssign(installation._id)}
                        >
                          Assign
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="open-installations-section">
          <div className="section-header">
            <MapPin size={20} />
            <h3>In Progress</h3>
          </div>

          {loading ? (
            <p className="loading-text">Loading installations...</p>
          ) : error ? (
            <p className="error-text">Failed to load installations</p>
          ) : installations.filter(inst => inst.status === 'assigned' || inst.status === 'under_review').length === 0 ? (
            <p className="no-data-text">No installations in progress</p>
          ) : (
            <div className="table-container">
              <table className="installations-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Customer</th>
                    <th>Plumber</th>
                    <th>Status</th>
                    <th>Serial Photo</th>
                    <th>Warranty</th>
                    <th>Installation Photo</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {installations
                    .filter(inst => inst.status === 'assigned' || inst.status === 'under_review')
                    .map((installation) => (
                    <tr key={installation._id}>
                      <td className="installation-id">{installation._id}</td>
                      <td className="customer-name">{installation.client?.name}</td>
                      <td className="plumber">
                        {installation.assigned_plumber_id || 'N/A'}
                      </td>
                      <td className="status-badge">
                        <span className={`badge ${installation.status === 'assigned' ? 'badge-assigned' : 'badge-review'}`}>
                          {installation.status === 'assigned' ? 'Assigned' : 'Under Review'}
                        </span>
                      </td>
                      <td className="image-link">
                        {installation.completion_images?.serial_number_url ? (
                          <a 
                            href={installation.completion_images.serial_number_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="view-link"
                          >
                            View
                          </a>
                        ) : 'N/A'}
                      </td>
                      <td className="image-link">
                        {installation.completion_images?.warranty_card_url ? (
                          <a 
                            href={installation.completion_images.warranty_card_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="view-link"
                          >
                            View
                          </a>
                        ) : 'N/A'}
                      </td>
                      <td className="image-link">
                        {installation.completion_images?.installation_url ? (
                          <a 
                            href={installation.completion_images.installation_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="view-link"
                          >
                            View
                          </a>
                        ) : 'N/A'}
                      </td>
                      <td className="assign-cell">
                        {installation.status === 'under_review' ? (
                          <button
                            className="assign-btn approve-btn"
                            onClick={() => handleApprove(installation._id)}
                          >
                            Approve
                          </button>
                        ) : (
                          <span className="waiting-text">Waiting...</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

<div className="open-installations-section">
  <div className="section-header">
    <MapPin size={20} />
    <h3>Installation Complete</h3>
  </div>

  {loading ? (
    <p className="loading-text">Loading completed installations...</p>
  ) : error ? (
    <p className="error-text">Failed to load installations</p>
  ) : installations.filter(inst => inst.status === 'completed').length === 0 ? (
    <p className="no-data-text">No completed installations</p>
  ) : (
    <div className="table-container">
      <table className="installations-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Customer</th>
            <th>Plumber</th>
            <th>Model</th>
            <th>Completed On</th> {/* ✅ New column */}
          </tr>
        </thead>
        <tbody>
          {installations
            .filter(inst => inst.status === 'completed')
            .map((installation) => (
              <tr key={installation._id}>
                {/* ✅ Installation ID */}
                <td className="installation-id">{installation._id}</td>

                {/* ✅ Customer Name */}
                <td className="customer-name">{installation.client?.name || 'N/A'}</td>

                {/* ✅ Plumber ID or N/A */}
                <td className="plumber">{installation.assigned_plumber_id || 'N/A'}</td>

                {/* ✅ Model Purchased */}
                <td className="model">{installation.model_purchased || 'N/A'}</td>

                {/* ✅ Completed Date formatted */}
                <td className="completed-date">
                  {installation.completion_submitted_at
                    ? new Date(installation.completion_submitted_at).toLocaleDateString('en-IN', {
                        day: '2-digit',
                        month: 'short',
                        year: 'numeric',
                      })
                    : 'N/A'}
                </td>
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  )}
</div>


        {openForm && (
          <>
            <div className="modal-overlay" onClick={() => setOpenForm(false)} />
            <div className="installation-form-container">
              <div className="form-header">
                <h3>Create Installation</h3>
                <button className="close-btn" onClick={() => setOpenForm(false)}>
                  <X size={20} />
                </button>
              </div>

              <form className="installation-form" onSubmit={handleSubmit}>
                <div className="form-row">
                  <div className="form-field">
                    <label>Customer Name</label>
                    <input
                      type="text"
                      name="customerName"
                      value={formData.customerName}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>Customer Contact No.</label>
                    <input
                      type="tel"
                      name="contact"
                      value={formData.contact}
                      onChange={handleChange}
                      required
                      pattern="[6-9]\d{9}"
                      title="Enter a valid 10-digit phone number"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Address</label>
                  <input
                    type="text"
                    name="address"
                    value={formData.address}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>Pincode</label>
                    <input
                      type="text"
                      name="pincode"
                      value={formData.pincode}
                      onChange={handleChange}
                      required
                      pattern="\d{6}"
                      title="Enter a valid 6-digit pincode"
                    />
                  </div>
                  <div className="form-field">
                    <label>City</label>
                    <input
                      type="text"
                      name="city"
                      value={formData.city}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-field">
                    <label>District</label>
                    <input
                      type="text"
                      name="district"
                      value={formData.district}
                      onChange={handleChange}
                      required
                    />
                  </div>
                  <div className="form-field">
                    <label>State</label>
                    <input
                      type="text"
                      name="state"
                      value={formData.state}
                      onChange={handleChange}
                      required
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Model</label>
                  <select
                    name="model"
                    value={formData.model}
                    onChange={handleChange}
                    required
                  >
                    <option value="" disabled>
                      Select Model
                    </option>
                    <option value="FL-80">FL-80</option>
                    <option value="FL-150">FL-150</option>
                    <option value="FL-250">FL-250</option>
                    <option value="FL-350">FL-350</option>
                    <option value="FL-500">FL-500</option>
                  </select>
                </div>

                <div className="form-buttons">
                  <button
                    type="button"
                    className="cancel-btn"
                    onClick={() => setOpenForm(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="submit-btn"
                    disabled={!isFormValid || submitting}
                  >
                    {submitting ? "Creating..." : "Create"}
                  </button>
                </div>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Installations;