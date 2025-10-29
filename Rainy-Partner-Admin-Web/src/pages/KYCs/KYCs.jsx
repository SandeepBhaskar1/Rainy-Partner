import React, { useState, useEffect } from "react";
import axios from "axios";
import { ClipboardCheck, Loader, X } from "lucide-react";
import "./KYCs.css";

const KYCs = () => {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [rejectedApprovals, setRejectedApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coordinators, setCoordinators] = useState([]);
  const [selectedCoordinator, setSelectedCoordinator] = useState("");
  const [selectedKycId, setSelectedKycId] = useState(null);
  const [selectedKycData, setSelectedKycData] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalLoading, setModalLoading] = useState(false);
  const [isViewOnly, setIsViewOnly] = useState(false);

  const backendUrl = import.meta.env.VITE_APP_BACKEND_URL;

  // Initial fetch - only get the list, not full details
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        setError(null);

        const token = localStorage.getItem("authToken");
        const response = await axios.get(`${backendUrl}/kyc/kyc-approvals`, {
          headers: { Authorization: `Bearer ${token}` },
        });

        const pending = response.data.pending || [];
        const rejected = response.data.rejected || [];

        setPendingApprovals(pending);
        setRejectedApprovals(rejected);
      } catch (err) {
        console.error("Error fetching KYC approvals:", err);
        setError("Failed to load KYC approvals");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [backendUrl]);

  // Fetch coordinators
  useEffect(() => {
    const fetchCoordinators = async () => {
      try {
        const token = localStorage.getItem("authToken");
        const res = await axios.get(`${backendUrl}/admin/co-ordinators`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCoordinators(res.data.coordinators || []);
      } catch (err) {
        console.error("Failed to load coordinators:", err);
        setCoordinators([]);
      }
    };

    fetchCoordinators();
  }, [backendUrl]);

  // Fetch full KYC details - used for both approve and view
  const fetchKycDetails = async (kycItem) => {
    const id = String(kycItem._id?.$oid || kycItem._id || kycItem.id);
    setSelectedKycId(id);
    setModalLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      
      // Fetch full KYC details
      const detailResponse = await axios.get(`${backendUrl}/kyc/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      const kycData = detailResponse.data || kycItem;

      // Fetch signed URLs for documents
      const signedUrls = {};
      const docs = [
        { key: "aadhaar_front", name: "aadhaar_front" },
        { key: "aadhaar_back", name: "aadhaar_back" },
        { key: "license_front", name: "license_front" },
        { key: "license_back", name: "license_back" },
      ];

      await Promise.all(
        docs.map(async ({ key, name }) => {
          const fileKey = kycData[key];
          if (!fileKey) return;
          try {
            const res = await axios.post(
              `${backendUrl}/installations/get-image`,
              { key: fileKey },
              { headers: { Authorization: `Bearer ${token}` } }
            );
            const signedUrl =
              res.data?.url ||
              res.data?.data?.url ||
              res.data?.signedUrl ||
              null;
            signedUrls[name] = signedUrl;
          } catch {
            signedUrls[name] = null;
          }
        })
      );

      setSelectedKycData({ ...kycData, signedUrls });
    } catch (err) {
      console.error("Error fetching KYC details:", err);
      setError("Failed to load KYC details");
      setSelectedKycData(null);
    } finally {
      setModalLoading(false);
    }
  };

  // Open modal for approval
  const openApproveModal = async (kycItem) => {
    setIsViewOnly(false);
    setShowModal(true);
    await fetchKycDetails(kycItem);
  };

  // Open modal for viewing only (rejected KYCs)
  const openViewModal = async (kycItem) => {
    setIsViewOnly(true);
    setShowModal(true);
    await fetchKycDetails(kycItem);
  };

  const handleApproveSubmit = async () => {
    if (!selectedCoordinator) {
      alert("Please select a coordinator");
      return;
    }

    try {
      const token = localStorage.getItem("authToken");
      await axios.post(
        `${backendUrl}/kyc/approve`,
        { id: selectedKycId, coordinator_id: selectedCoordinator },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setPendingApprovals((prev) =>
        prev.filter((item) => {
          const itemId = String(item._id?.$oid || item._id || item.id);
          return itemId !== selectedKycId;
        })
      );
      
      setShowModal(false);
      setSelectedCoordinator("");
      setSelectedKycId(null);
      setSelectedKycData(null);
      alert("KYC approved successfully!");
    } catch (err) {
      console.error("Error approving KYC:", err);
      alert("Failed to approve KYC");
    }
  };

  const handleReject = async (id) => {
    if (!confirm("Are you sure you want to reject this KYC?")) return;

    try {
      const token = localStorage.getItem("authToken");
      const res = await axios.post(
        `${backendUrl}/kyc/reject`,
        { id },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setPendingApprovals((prev) => {
        const filtered = prev.filter((item) => {
          const itemId = String(item._id?.$oid || item._id || item.id);
          return itemId !== id;
        });
        return filtered;
      });
      
      setRejectedApprovals((prev) => [
        ...prev,
        { ...res.data.data, status: "rejected" },
      ]);
      
      alert("KYC rejected successfully!");
    } catch (err) {
      console.error("Error rejecting KYC:", err);
      alert("Failed to reject KYC");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedCoordinator("");
    setSelectedKycId(null);
    setSelectedKycData(null);
    setIsViewOnly(false);
  };

  if (loading) {
    return (
      <div className="loading-spinner">
        <Loader size={32} className="spinner-icon" />
        <p>Loading KYCs...</p>
      </div>
    );
  }

  const filteredPending = pendingApprovals.filter(
    (item) =>
      item.needs_onboarding === false && item.agreement_status === true
  );

  return (
    <div className="kyc-page">
      <div className="kyc-container">
        {error && <div className="error-text">{error}</div>}

        {/* ---------- Pending KYCs ---------- */}
        <div className="kyc-section">
          <div className="section-header">
            <ClipboardCheck size={20} />
            <h3>Pending KYC Approvals ({filteredPending.length})</h3>
          </div>

          {filteredPending.length === 0 ? (
            <p className="no-data-text">No pending KYCs</p>
          ) : (
            <div className="table-container">
              <table className="kyc-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Plumber</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPending.map((item) => {
                    const id = String(item._id?.$oid || item._id || item.id);
                    return (
                      <tr key={id}>
                        <td>{id}</td>
                        <td>{item.name || "N/A"}</td>
                        <td>{item.phone || item.mobile || "N/A"}</td>
                        <td>{item.city || item.address?.city || "N/A"}</td>
                        <td>
                          <span className="status-badge pending">Pending</span>
                        </td>
                        <td>
                          <button
                            className="assign-btn"
                            onClick={() => openApproveModal(item)}
                          >
                            Review & Approve
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() => handleReject(id)}
                          >
                            Reject
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* ---------- Rejected KYCs ---------- */}
        <div className="kyc-section">
          <div className="section-header">
            <h3>Rejected ({rejectedApprovals.length})</h3>
          </div>

          {rejectedApprovals.length === 0 ? (
            <p className="no-data-text">No rejected KYCs</p>
          ) : (
            <div className="table-container">
              <table className="kyc-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Plumber</th>
                    <th>Phone</th>
                    <th>City</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rejectedApprovals.map((item) => {
                    const id = String(item._id?.$oid || item._id || item.id);
                    return (
                      <tr key={id}>
                        <td>{id}</td>
                        <td>
                          <button
                            className="view-link"
                            onClick={() => openViewModal(item)}
                            style={{ textDecoration: "underline", cursor: "pointer" }}
                          >
                            {item.name || "N/A"}
                          </button>
                        </td>
                        <td>{item.phone || item.mobile || "N/A"}</td>
                        <td>{item.city || item.address?.city || "N/A"}</td>
                        <td>
                          <span className="status-badge rejected">
                            Rejected
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* ---------- Approve Modal ---------- */}
      {showModal && (
        <div className="modal-overlay">
          <div className="modal-container" style={{ maxWidth: "800px" }}>
            <div className="modal-header">
              <h3>{isViewOnly ? "View KYC Details" : "Review KYC & Assign Coordinator"}</h3>
              <button className="close-btn" onClick={closeModal}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              {modalLoading ? (
                <div style={{ textAlign: "center", padding: "20px" }}>
                  <Loader size={32} className="spinner-icon" />
                  <p>Loading KYC details...</p>
                </div>
              ) : selectedKycData ? (
                <>
                  {/* Plumber Details */}
                  <div style={{ marginBottom: "20px" }}>
                    <h4>Plumber Information</h4>
                    <p><strong>Name:</strong> {selectedKycData.name || "N/A"}</p>
                    <p><strong>Phone:</strong> {selectedKycData.phone || selectedKycData.mobile || "N/A"}</p>
                    <p>
                      <strong>Address:</strong>{" "}
                      {selectedKycData.address
                        ? `${selectedKycData.address.address || ""}, ${
                            selectedKycData.address.city || ""
                          }, ${selectedKycData.address.district || ""}, ${
                            selectedKycData.address.state || ""
                          }, ${selectedKycData.address.pin || ""}`
                        : selectedKycData.city || "N/A"}
                    </p>
                    {isViewOnly && (
                      <p>
                        <strong>Status:</strong>{" "}
                        <span className="status-badge rejected">Rejected</span>
                      </p>
                    )}
                  </div>

                  {/* Documents */}
                  <div style={{ marginBottom: "20px" }}>
                    <h4>Documents</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                      {[
                        { key: "aadhaar_front", label: "Aadhaar Front" },
                        { key: "aadhaar_back", label: "Aadhaar Back" },
                        { key: "license_front", label: "License Front" },
                        { key: "license_back", label: "License Back" },
                      ].map(({ key, label }) => (
                        <div key={key}>
                          <strong>{label}:</strong>{" "}
                          {selectedKycData.signedUrls?.[key] ? (
                            <button
                              className="view-link"
                              onClick={() =>
                                window.open(
                                  selectedKycData.signedUrls[key],
                                  "_blank"
                                )
                              }
                            >
                              View Document
                            </button>
                          ) : (
                            <span>Not available</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Coordinator Selection - Only show if not view only */}
                  {!isViewOnly && (
                    <div>
                      <label><strong>Select Coordinator:</strong></label>
                      <select
                        value={selectedCoordinator}
                        onChange={(e) => setSelectedCoordinator(e.target.value)}
                        style={{ width: "100%", padding: "8px", marginTop: "5px" }}
                      >
                        <option value="">-- Select Coordinator --</option>
                        {coordinators.map((coord) => (
                          <option key={coord._id} value={coord._id}>
                            {coord.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              ) : (
                <p>Failed to load KYC details</p>
              )}
            </div>

            {!isViewOnly && (
              <div className="modal-footer">
                <button className="submit-btn" onClick={handleApproveSubmit} disabled={modalLoading}>
                  Approve & Assign
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default KYCs;