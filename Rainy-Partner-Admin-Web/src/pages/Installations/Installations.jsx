import React, { useState, useEffect } from "react";
import { CirclePlus, X, ClipboardList, MapPin, Loader } from "lucide-react";
import axios from "axios";
import "./Installations.css";
import api from "../../api/axiosInstence";

const Installations = () => {
  const [openForm, setOpenForm] = useState(false);
  const [openAssignModal, setOpenAssignModal] = useState(false);
  const [installations, setInstallations] = useState([]);
  const [plumbers, setPlumbers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [selectedInstallation, setSelectedInstallation] = useState(null);
  const [assignLoading, setAssignLoading] = useState(false);
  const [selectedPlumber, setSelectedPlumber] = useState("");
  const [showReassignModal, setShowReassignModal] = useState(false);
  const [newPlumberId, setNewPlumberId] = useState("");
  const [selectedInstallationDetails, setSelectedInstallationDetails] = useState(null);
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

  useEffect(() => {
    fetchInstallations();
    fetchPlumbers();
  }, []);

  const fetchInstallations = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/post-leads`);
      setInstallations(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching installations:", error);
      setError(true);
      setLoading(false);
    } finally {
      setLoading(false);
    }
  };

  const fetchPlumbers = async () => {
    try {
      setLoading(true)
      const response = await api.get(`/admin/plumbers`);
      const plumbersData = response.data.plumbers || response.data || [];
      setPlumbers(plumbersData);
    } catch (error) {
      console.error("Error fetching plumbers:", error);
    } finally {
      setLoading(false)
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

      const response = await api.post(`/post-leads`, payload);

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
        fetchInstallations();
      }
    } catch (error) {
      console.error("Error creating installation:", error);
      alert("Failed to create installation. Please check the console.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssign = (installation) => {
    setSelectedInstallation(installation);
    setSelectedPlumber("");
    setOpenAssignModal(true);
  };

  const handleAssignInstallation = async (plumberId) => {
    if (!plumberId) {
      alert("Please select a plumber");
      return;
    }

    const plumber = plumbers.find((p) => p.id === plumberId || p._id === plumberId);

    setAssignLoading(true);

    try {
      const payload = {
        assigned_plumber_id: plumberId,
        status: "assigned",
        assigned_on: new Date().toISOString(),
      };

      const response = await api.put(
        `/post-leads/${selectedInstallation._id}/assign`,
        payload,
      );

      if (response.status === 200) {
        alert("Plumber assigned successfully!");
        setOpenAssignModal(false);
        setSelectedInstallation(null);
        setSelectedPlumber("");
        fetchInstallations();
      }
    } catch (error) {
      console.error("Error assigning plumber:", error);
      alert("Failed to assign plumber. Please try again.");
    } finally {
      setAssignLoading(false);
    }
  };

  const handleApprove = async (installationId) => {
    if (
      !window.confirm("Are you sure you want to approve this installation?")
    ) {
      return;
    }

    try {
      const response = await api.put(
        `/post-leads/${installationId}/status-completed`,
        {
          status: "completed",
        }
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

  const [signedUrls, setSignedUrls] = useState({});

  useEffect(() => {
    if (installations.length > 0) {
      fetchSignedUrls();
    }
  }, [installations]);

  const fetchSignedUrls = async () => {
    const urls = {};

    for (const inst of installations) {
      urls[inst._id] = {};

      try {
        const { completion_images } = inst;

        if (completion_images?.serial_number_key) {
          const res = await api.post(
            `/installations/get-image`,
            { key: completion_images.serial_number_key },
          );
          urls[inst._id].serial = res.data.url;
        }

        if (completion_images?.warranty_card_key) {
          const res = await api.post(
            `/installations/get-image`,
            { key: completion_images.warranty_card_key },
          );
          urls[inst._id].warranty = res.data.url;
        }

        if (completion_images?.installation_key) {
          const res = await api.post(
            `/installations/get-image`,
            { key: completion_images.installation_key },
          );
          urls[inst._id].installation = res.data.url;
        }
      } catch (err) {
        console.error("Error fetching signed URL:", err);
      }
    }

    setSignedUrls(urls);
  };

  const formatDate = (dateString) => {
    if (!dateString) return "N/A";
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

  const formatFullDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getFilteredPlumbers = () => {
    if (!selectedInstallation) return [];
    const servicePins = plumbers.filter((plumber) => {
      const servicePinList = Array.isArray(plumber.service_area_pin)
        ? plumber.service_area_pin.map((p) => p.trim())
        : [];
      return (
        servicePinList.includes(selectedInstallation?.client?.pincode) &&
        plumber.kyc_status === "approved"
      );
    });
    return servicePins;
  };

  const handleReassignPlumber = (installation) => {
    setSelectedInstallation(installation);
    setShowReassignModal(true);
  };

  const handleConfirmReassign = async () => {
    if (!newPlumberId) {
      alert("Please select a plumber");
      return;
    }

    try {
      await api.put(
        `/post-leads/${selectedInstallation._id}/reassign`,
        {
          status: 'assigned',
          assigned_plumber_id: newPlumberId,
          assigned_on: new Date().toISOString(),
        },
      );

      alert("Plumber reassigned successfully!");
      setShowReassignModal(false);
      setNewPlumberId("");
      setSelectedInstallation(null);
      fetchInstallations();
      
    } catch (error) {
      console.error("Error reassigning plumber:", error);
      alert(error.response?.data?.message || "Failed to reassign plumber");
    }
  };

  const handleCancelInstallation = async (installationId) => {
    if (!window.confirm("Are you sure you want to cancel this installation?")) {
      return;
    }

    try {
      await api.put(
        `/post-leads/${installationId}/cancel`,
        {},
      );

      alert("Installation cancelled successfully!");
      fetchInstallations();
    } catch (error) {
      console.error("Error canceling installation:", error);
      alert(error.response?.data?.message || "Failed to cancel installation");
    }
  };

  const getPlumberName = (plumberId) => {
    if (!plumberId) return "N/A";
    
    if (plumberId.includes("(") && plumberId.includes(")")) {
      return plumberId;
    }
    
    const plumber = plumbers.find((p) => p.id === plumberId || p._id === plumberId);
    
    if (plumber) {
      return `${plumber.name} (${plumber.phone})`;
    }
    
    return plumberId;
  };

  const handleViewDetails = (installation) => {
    setSelectedInstallationDetails(installation);
  };

  if (loading)
    return (
      <div className="loading-spinner">
        <Loader size={32} className="spinner-icon" />
        <p>Loading plumbers...</p>
      </div>
    );

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
          ) : installations.filter((inst) => inst.status === "not-assigned")
              .length === 0 ? (
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
                    .filter((inst) => inst.status === "not-assigned")
                    .map((installation) => (
                      <tr key={installation._id}>
                        <td 
                          className="installation-id clickable-id"
                          onClick={() => handleViewDetails(installation)}
                        >
                          {installation._id}
                        </td>
                        <td className="customer-name">
                          {installation.client?.name}
                        </td>
                        <td className="location">
                          {installation.client?.city},{" "}
                          {installation.client?.state}
                        </td>
                        <td className="model">
                          {installation.model_purchased}
                        </td>
                        <td className="created-date">
                          {formatDate(installation.created_at)}
                        </td>
                        <td className="assign-cell">
                          <button
                            className="assign-btn"
                            onClick={() => handleAssign(installation)}
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
          ) : installations.filter(
              (inst) =>
                inst.status === "assigned" || inst.status === "under_review"
            ).length === 0 ? (
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
                    .filter(
                      (inst) =>
                        inst.status === "assigned" ||
                        inst.status === "under_review"
                    )
                    .map((installation) => (
                      <tr key={installation._id}>
                        <td 
                          className="installation-id clickable-id"
                          onClick={() => handleViewDetails(installation)}
                        >
                          {installation._id}
                        </td>
                        <td className="customer-name">
                          {installation.client?.name}
                        </td>
                        <td className="plumber">
                          {getPlumberName(installation.assigned_plumber_id)}
                        </td>
                        <td className="status-badge-installation">
                          <span
                            className={`badge ${
                              installation.status === "assigned"
                                ? "badge-assigned"
                                : "badge-review"
                            }`}
                          >
                            {installation.status === "assigned"
                              ? "Assigned"
                              : "Under Review"}
                          </span>
                        </td>
                        <td className="image-link">
                          {signedUrls[installation._id]?.serial ? (
                            <a
                              href={signedUrls[installation._id].serial}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="view-link"
                            >
                              View
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>

                        <td className="image-link">
                          {signedUrls[installation._id]?.warranty ? (
                            <a
                              href={signedUrls[installation._id].warranty}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="view-link"
                            >
                              View
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>

                        <td className="image-link">
                          {signedUrls[installation._id]?.installation ? (
                            <a
                              href={signedUrls[installation._id].installation}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="view-link"
                            >
                              View
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>

                        <td className="assign-cell">
                          {installation.status === "under_review" ? (
                            <button
                              className="assign-btn approve-btn"
                              onClick={() => handleApprove(installation._id)}
                            >
                              Approve
                            </button>
                          ) : installation.status === "assigned" ? (
                            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                              <button
                                className="assign-btn reassign-btn"
                                onClick={() => handleReassignPlumber(installation)}
                              >
                                Reassign
                              </button>
                              <button
                                className="assign-cancel-btn"
                                onClick={() => handleCancelInstallation(installation._id)}
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <span className="waiting-text">
                              {installation.status}
                            </span>
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
          ) : installations.filter((inst) => inst.status === "completed")
              .length === 0 ? (
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
                    <th>Serial Image</th>
                    <th>Warranty</th>
                    <th>Installation Image</th>
                    <th>Completed On</th>
                  </tr>
                </thead>
                <tbody>
                  {installations
                    .filter((inst) => inst.status === "completed")
                    .map((installation) => (
                      <tr key={installation._id}>
                        <td 
                          className="installation-id clickable-id"
                          onClick={() => handleViewDetails(installation)}
                        >
                          {installation._id}
                        </td>
                        <td className="customer-name">
                          {installation.client?.name || "N/A"}
                        </td>
                        <td className="plumber">
                          {getPlumberName(installation.assigned_plumber_id)}
                        </td>
                        <td className="model">
                          {installation.model_purchased || "N/A"}
                        </td>
                        <td className="image-link">
                          {signedUrls[installation._id]?.serial ? (
                            <a
                              href={signedUrls[installation._id].serial}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="view-link"
                            >
                              View
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>

                        <td className="image-link">
                          {signedUrls[installation._id]?.warranty ? (
                            <a
                              href={signedUrls[installation._id].warranty}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="view-link"
                            >
                              View
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>

                        <td className="image-link">
                          {signedUrls[installation._id]?.installation ? (
                            <a
                              href={signedUrls[installation._id].installation}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="view-link"
                            >
                              View
                            </a>
                          ) : (
                            "N/A"
                          )}
                        </td>
                        <td className="completed-date">
                          {installation.completion_submitted_at
                            ? new Date(
                                installation.completion_submitted_at
                              ).toLocaleDateString("en-IN", {
                                day: "2-digit",
                                month: "short",
                                year: "numeric",
                              })
                            : "N/A"}
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
                <button
                  className="close-btn"
                  onClick={() => setOpenForm(false)}
                >
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

        {openAssignModal && selectedInstallation && (
          <>
            <div
              className="assign-modal-overlay"
              onClick={() => setOpenAssignModal(false)}
            >
              <div
                className="assign-modal"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="assign-modal-header">
                  <h3>Assign Installation {selectedInstallation._id}</h3>
                  <button
                    className="assign-modal-close"
                    onClick={() => setOpenAssignModal(false)}
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="assign-modal-body">
                  <div className="assign-section">
                    <label>Installation Address</label>
                    <div className="installation-address-box">
                      <p className="customer-name-text">
                        {selectedInstallation.client?.name}
                      </p>
                      <p className="address-text">
                        {selectedInstallation.client?.address},{" "}
                        {selectedInstallation.client?.city},{" "}
                        {selectedInstallation.client?.district} –{" "}
                        {selectedInstallation.client?.state} –{" "}
                        {selectedInstallation.client?.pincode}
                      </p>
                    </div>
                  </div>

                  <div className="assign-section">
                    <label>Choose Plumber</label>
                    <select
                      value={selectedPlumber}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedPlumber(value);
                      }}
                      className="assign-select"
                    >
                      <option value="">
                        Select manually or use suggestions ↓
                      </option>
                      {plumbers
                        .filter((p) => p.kyc_status === "approved")
                        .map((plumber) => {
                          const plumberId = plumber.id || plumber._id;
                          return (
                            <option key={plumberId} value={plumberId}>
                              {plumber.name} ({plumber.phone})
                            </option>
                          );
                        })}
                    </select>
                  </div>

                  <div className="assign-section">
                    <label>Suggested Plumbers</label>
                    {getFilteredPlumbers().length > 0 ? (
                      <div className="suggested-plumbers">
                        {getFilteredPlumbers().map((plumber) => (
                          <div className="plumber-card" key={plumber.id || plumber._id}>
                            <div className="plumber-info">
                              <h4>{plumber.name}</h4>
                              <div className="plumber-details">
                                <span>
                                  {plumber.address?.city || plumber.city}
                                </span>
                                <span>•</span>
                                <span>{plumber.phone}</span>
                                <span>•</span>
                                <span>⭐ {plumber.trust || "4.9"}</span>
                              </div>
                            </div>
                            <button
                              className="assign-card-btn"
                              onClick={() =>
                                handleAssignInstallation(plumber.id || plumber._id)
                              }
                              disabled={assignLoading}
                            >
                              {assignLoading ? "..." : "Assign"}
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="no-plumber">No matching plumbers found.</p>
                    )}
                  </div>
                </div>

                <div className="assign-modal-footer">
                  <button
                    className="assign-cancel-btn"
                    onClick={() => setOpenAssignModal(false)}
                  >
                    Cancel
                  </button>
                  <button
                    className="assign-confirm-btn"
                    disabled={!selectedPlumber || assignLoading}
                    onClick={() => handleAssignInstallation(selectedPlumber)}
                  >
                    {assignLoading ? "Assigning..." : "Assign"}
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {showReassignModal && (
          <div
            className="modal-overlay"
            onClick={() => setShowReassignModal(false)}
          >
            <div
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h3>Reassign Plumber</h3>
                <button
                  className="modal-close"
                  onClick={() => setShowReassignModal(false)}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="modal-body">
                <p>
                  <strong>Installation ID:</strong> {selectedInstallation?._id}
                </p>
                <p>
                  <strong>Customer:</strong> {selectedInstallation?.client?.name}
                </p>
                <p>
                  <strong>Current Plumber:</strong>{" "}
                  {getPlumberName(selectedInstallation?.assigned_plumber_id)}
                </p>

                <div className="form-group" style={{ marginTop: "20px" }}>
                  <label>Select New Plumber *</label>
                  <select
                    value={newPlumberId}
                    onChange={(e) => setNewPlumberId(e.target.value)}
                    className="form-select"
                  >
                    <option value="">Select Plumber</option>
                    {plumbers
                      .filter((p) => p._id !== selectedInstallation?.assigned_plumber_id && p.kyc_status === 'approved')
                      .map((plumber) => (
                        <option key={plumber._id} value={plumber.id}>
                          {plumber.name} - {plumber.phone}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div className="modal-footer">
                <button
                  className="btn-cancel"
                  onClick={() => setShowReassignModal(false)}
                >
                  Cancel
                </button> 
                <button className="btn-submit" onClick={handleConfirmReassign}>
                  Confirm Reassign
                </button>
              </div>
            </div>
          </div>
        )}

        {selectedInstallationDetails && (
          <div className="modal-overlay" onClick={() => setSelectedInstallationDetails(null)}>
            <div
              className="installation-details-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="installation-modal-header">
                <h3>Installation Details</h3>
                <button
                  className="modal-close-btn"
                  onClick={() => setSelectedInstallationDetails(null)}
                >
                  <X size={24} />
                </button>
              </div>

              <div className="installation-modal-body">
                <div className="installation-top-section">
                  <div className="installation-id-badge">
                    <span className="label">Installation ID</span>
                    <span className="value">{selectedInstallationDetails._id}</span>
                  </div>
                  <div
                    className={`status-badge-large status-${selectedInstallationDetails.status?.toLowerCase().replace("-", "_")}`}
                  >
                    <span className="status-dot"></span>
                    {selectedInstallationDetails.status === "not-assigned" ? "Not Assigned" :
                     selectedInstallationDetails.status === "assigned" ? "Assigned" :
                     selectedInstallationDetails.status === "under_review" ? "Under Review" :
                     selectedInstallationDetails.status === "completed" ? "Completed" :
                     selectedInstallationDetails.status === "cancelled" ? "Cancelled" : 
                     selectedInstallationDetails.status}
                  </div>
                </div>

                <div className="info-cards-row">
                  <div className="info-card customer-card">
                    <div className="icon-circle customer-icon">👤</div>
                    <div className="info-content">
                      <span className="info-label">Customer</span>
                      <span className="info-name">
                        {selectedInstallationDetails.client?.name || "N/A"}
                      </span>
                      <span className="info-detail">
                        {selectedInstallationDetails.client?.phone || "N/A"}
                      </span>
                    </div>
                  </div>
                  <div className="info-card plumber-card">
                    <div className="icon-circle plumber-icon">🔧</div>
                    <div className="info-content-01">
                      <span className="info-label">Plumber</span>
                      <span className="info-name">
                        {getPlumberName(selectedInstallationDetails.assigned_plumber_id)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="address-section">
                  <div className="address-card">
                    <div className="address-header">📍 Installation Address</div>
                    <div className="address-content">
                      {selectedInstallationDetails.client?.address || "N/A"}
                      <br />
                      {selectedInstallationDetails.client?.city}, {selectedInstallationDetails.client?.district}
                      <br />
                      {selectedInstallationDetails.client?.state} - {selectedInstallationDetails.client?.pincode}
                    </div>
                  </div>
                </div>

                <div className="model-card">
                  <div className="model-label">Model Purchased</div>
                  <div className="model-value">
                    {selectedInstallationDetails.model_purchased || "N/A"}
                  </div>
                </div>

                {(selectedInstallationDetails.status === "under_review" || 
                  selectedInstallationDetails.status === "completed") && (
                  <div className="images-section">
                    <h4 className="section-title">📸 Completion Images</h4>
                    <div className="images-grid">
                      <div className="image-card">
                        <div className="image-card-label">Serial Number</div>
                        {signedUrls[selectedInstallationDetails._id]?.serial ? (
                          <>
                            <img
                              src={signedUrls[selectedInstallationDetails._id].serial}
                              alt="Serial Number"
                              className="image-preview"
                              onClick={() => window.open(signedUrls[selectedInstallationDetails._id].serial, "_blank")}
                            />
                            <button
                              className="view-image-btn"
                              onClick={() => window.open(signedUrls[selectedInstallationDetails._id].serial, "_blank")}
                            >
                              View Full Image
                            </button>
                          </>
                        ) : (
                          <button className="view-image-btn" disabled>
                            Not Available
                          </button>
                        )}
                      </div>

                      <div className="image-card">
                        <div className="image-card-label">Warranty Card</div>
                        {signedUrls[selectedInstallationDetails._id]?.warranty ? (
                          <>
                            <img
                              src={signedUrls[selectedInstallationDetails._id].warranty}
                              alt="Warranty Card"
                              className="image-preview"
                              onClick={() => window.open(signedUrls[selectedInstallationDetails._id].warranty, "_blank")}
                            />
                            <button
                              className="view-image-btn"
                              onClick={() => window.open(signedUrls[selectedInstallationDetails._id].warranty, "_blank")}
                            >
                              View Full Image
                            </button>
                          </>
                        ) : (
                          <button className="view-image-btn" disabled>
                            Not Available
                          </button>
                        )}
                      </div>

                      <div className="image-card">
                        <div className="image-card-label">Installation Photo</div>
                        {signedUrls[selectedInstallationDetails._id]?.installation ? (
                          <>
                            <img
                              src={signedUrls[selectedInstallationDetails._id].installation}
                              alt="Installation"
                              className="image-preview"
                              onClick={() => window.open(signedUrls[selectedInstallationDetails._id].installation, "_blank")}
                            />
                            <button
                              className="view-image-btn"
                              onClick={() => window.open(signedUrls[selectedInstallationDetails._id].installation, "_blank")}
                            >
                              View Full Image
                            </button>
                          </>
                        ) : (
                          <button className="view-image-btn" disabled>
                            Not Available
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                <div className="dates-grid">
                  <div className="date-card">
                    <span className="date-label">Created At</span>
                    <span className="date-value">
                      {formatFullDate(selectedInstallationDetails.created_at)}
                    </span>
                  </div>

                  {selectedInstallationDetails.assigned_on && (
                    <div className="date-card">
                      <span className="date-label">Assigned On</span>
                      <span className="date-value">
                        {formatFullDate(selectedInstallationDetails.assigned_on)}
                      </span>
                    </div>
                  )}

                  {selectedInstallationDetails.completion_submitted_at && (
                    <div className="date-card">
                      <span className="date-label">Completion Submitted</span>
                      <span className="date-value">
                        {formatFullDate(selectedInstallationDetails.completion_submitted_at)}
                      </span>
                    </div>
                  )}

                  {selectedInstallationDetails.approved_at && (
                    <div className="date-card">
                      <span className="date-label">Approved At</span>
                      <span className="date-value">
                        {formatFullDate(selectedInstallationDetails.approved_at)}
                      </span>
                    </div>
                  )}

                  {selectedInstallationDetails.rejected_at && (
                    <div className="date-card">
                      <span className="date-label">Rejected At</span>
                      <span className="date-value">
                        {formatFullDate(selectedInstallationDetails.rejected_at)}
                      </span>
                    </div>
                  )}

                  {selectedInstallationDetails.cancelled_at && (
                    <div className="date-card">
                      <span className="date-label">Cancelled At</span>
                      <span className="date-value">
                        {formatFullDate(selectedInstallationDetails.cancelled_at)}
                      </span>
                    </div>
                  )}
                </div>

                {selectedInstallationDetails.rejection_reason && (
                  <div className="cancelled-reason-card">
                    <span className="reason-label">Rejection Reason</span>
                    <span className="reason-text">
                      {selectedInstallationDetails.rejection_reason}
                    </span>
                  </div>
                )}

                {(selectedInstallationDetails.customer_paid !== undefined || 
                  selectedInstallationDetails.plumber_paid !== undefined) && (
                  <div className="payment-status-section">
                    <div className={`payment-badge ${selectedInstallationDetails.customer_paid ? 'payment-paid' : 'payment-unpaid'}`}>
                      Customer Payment: {selectedInstallationDetails.customer_paid ? '✓ Paid' : '✗ Unpaid'}
                    </div>
                    <div className={`payment-badge ${selectedInstallationDetails.plumber_paid ? 'payment-paid' : 'payment-unpaid'}`}>
                      Plumber Payment: {selectedInstallationDetails.plumber_paid ? '✓ Paid' : '✗ Unpaid'}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Installations;