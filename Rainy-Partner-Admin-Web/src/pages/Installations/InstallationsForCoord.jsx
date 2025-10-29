import React, { useState, useEffect, useMemo } from "react";
import { CirclePlus, X, ClipboardList, MapPin, Loader } from "lucide-react";
import axios from "axios";
import "./Installations.css";

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
  const [assignedPlumberIds, setAssignedPlumberIds] = useState([]);
  const [userRole, setUserRole] = useState(null);
  const [signedUrls, setSignedUrls] = useState({});
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

  // Consolidated initial data fetch
  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        setLoading(true);
        const token = localStorage.getItem("authToken");
        const storedUser = localStorage.getItem("user");
        
        console.log("=== USER DATA DEBUG ===");
        console.log("Stored user:", storedUser);
        
        let role = null;
        let plumberIds = [];

        // Get user role and coordinator data
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          console.log("Parsed user:", parsedUser);
          console.log("User role:", parsedUser?.role);
          role = parsedUser?.role?.toLowerCase(); // Normalize to lowercase
          setUserRole(role);
          
          // If coordinator, fetch their assigned plumbers
          if (role === "coordinator") {
            console.log("Fetching coordinator profile...");
            try {
              const coordinatorRes = await axios.get(
                `${BACKEND_URL}/coordinator/profile`,
                { headers: { Authorization: `Bearer ${token}` } }
              );
              console.log("Coordinator response:", coordinatorRes.data);
              plumberIds = coordinatorRes.data?.assigned_plumbers || [];
              setAssignedPlumberIds(plumberIds);
              console.log("Coordinator's assigned plumber IDs:", plumberIds);
            } catch (error) {
              console.error("Error fetching coordinator profile:", error);
            }
          } else {
            console.log("User is not a coordinator, role is:", role);
          }
        } else {
          console.log("No COORDINATOR data in localStorage");
        }

        // Fetch installations
        try {
          const installationsRes = await axios.get(`${BACKEND_URL}/post-leads`);
          setInstallations(installationsRes.data);
          console.log("Installations fetched:", installationsRes.data.length);
        } catch (error) {
          console.error("Error fetching installations:", error);
          setError(true);
        }

        // Fetch plumbers based on role
        try {
          const endpoint = role === "coordinator" 
            ? `${BACKEND_URL}/coordinator/plumbers`
            : `${BACKEND_URL}/admin/plumbers`;
          
          console.log("Fetching plumbers from:", endpoint);
          const plumbersRes = await axios.get(endpoint, {
            headers: { Authorization: `Bearer ${token}` },
          });
          const plumbersData = plumbersRes.data.plumbers || plumbersRes.data || [];
          setPlumbers(plumbersData);
          console.log("Plumbers data:", plumbersData.length, "plumbers loaded");
        } catch (error) {
          console.error("Error fetching plumbers:", error);
        }

        setLoading(false);
      } catch (error) {
        console.error("Error in initial data fetch:", error);
        setLoading(false);
        setError(true);
      }
    };

    fetchInitialData();
  }, [BACKEND_URL]);

  // Fetch signed URLs when installations and role data are ready
  useEffect(() => {
    if (installations.length > 0 && !loading && userRole !== null) {
      fetchSignedUrls();
    }
  }, [installations, loading, userRole, assignedPlumberIds]);

  const fetchSignedUrls = async () => {
    const token = localStorage.getItem("authToken");
    
    if (!token) {
      console.warn("No auth token found for fetching signed URLs");
      return;
    }
    
    const urls = {};

    // Get only installations that coordinator should see
    let installationsToFetch = installations;
    
    if (userRole === "coordinator") {
      installationsToFetch = installations.filter((inst) => {
        // Include not-assigned (open) installations
        if (inst.status === "not-assigned") {
          return true;
        }
        // Include only installations assigned to coordinator's plumbers
        const plumberId = String(inst.assigned_plumber_id || "");
        return assignedPlumberIds.some((id) => String(id) === plumberId);
      });
    }

    console.log("Fetching signed URLs for", installationsToFetch.length, "installations");

    for (const inst of installationsToFetch) {
      const { completion_images } = inst;
      
      // Skip if no completion images object or all image keys are missing
      if (!completion_images || 
          (!completion_images.serial_number_key && 
           !completion_images.warranty_card_key && 
           !completion_images.installation_key)) {
        console.log(`Skipping ${inst._id} - no completion images`);
        continue;
      }
      
      urls[inst._id] = {};

      // Fetch serial number image
      if (completion_images.serial_number_key) {
        try {
          const res = await axios.post(
            `${BACKEND_URL}/co-ordinator/get-image`,
            { key: completion_images.serial_number_key },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          urls[inst._id].serial = res.data.url;
        } catch (err) {
          console.error(`Error fetching serial image for ${inst._id}:`, err.response?.status, err.message);
        }
      }

      // Fetch warranty card image
      if (completion_images.warranty_card_key) {
        try {
          const res = await axios.post(
            `${BACKEND_URL}/co-ordinator/get-image`,
            { key: completion_images.warranty_card_key },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          urls[inst._id].warranty = res.data.url;
        } catch (err) {
          console.error(`Error fetching warranty image for ${inst._id}:`, err.response?.status, err.message);
        }
      }

      // Fetch installation image
      if (completion_images.installation_key) {
        try {
          const res = await axios.post(
            `${BACKEND_URL}/co-ordinator/get-image`,
            { key: completion_images.installation_key },
            { headers: { Authorization: `Bearer ${token}` } }
          );
          urls[inst._id].installation = res.data.url;
        } catch (err) {
          console.error(`Error fetching installation image for ${inst._id}:`, err.response?.status, err.message);
        }
      }
    }

    setSignedUrls(urls);
    console.log("Signed URLs fetched for", Object.keys(urls).length, "installations");
  };

  // Memoized filter function
  const getFilteredInstallations = useMemo(() => {
    return (status) => {
      console.log("=== FILTERING DEBUG ===");
      console.log("Current user role:", userRole);
      console.log("Assigned plumber IDs:", assignedPlumberIds);
      console.log("Filter status:", status);
      
      let filtered = installations.filter((inst) => {
        if (status === "not-assigned") {
          return inst.status === "not-assigned";
        } else if (status === "in-progress") {
          return inst.status === "assigned" || inst.status === "under_review";
        } else if (status === "completed") {
          return inst.status === "completed";
        }
        return false;
      });

      console.log("Filtered by status:", filtered.length);

      // If coordinator, filter by assigned plumbers (except for open installations)
      if (userRole === "coordinator" && status !== "not-assigned") {
        console.log("Applying coordinator filter...");
        filtered = filtered.filter((inst) => {
          const plumberId = String(inst.assigned_plumber_id || "");
          console.log("Checking installation:", inst._id, "plumber:", plumberId);
          const match = assignedPlumberIds.some((id) => String(id) === plumberId);
          console.log("Match found:", match);
          return match;
        });
        console.log("After coordinator filter:", filtered.length);
      }

      return filtered;
    };
  }, [installations, userRole, assignedPlumberIds]);

  // Memoized filtered lists - only compute after data is loaded
  const openInstallations = useMemo(() => {
    if (loading || installations.length === 0) return [];
    return getFilteredInstallations("not-assigned");
  }, [getFilteredInstallations, loading, installations.length]);

  const inProgressInstallations = useMemo(() => {
    if (loading || installations.length === 0) return [];
    return getFilteredInstallations("in-progress");
  }, [getFilteredInstallations, loading, installations.length]);

  const completedInstallations = useMemo(() => {
    if (loading || installations.length === 0) return [];
    return getFilteredInstallations("completed");
  }, [getFilteredInstallations, loading, installations.length]);

  // Filter plumbers for coordinator - only show their assigned plumbers
  const getAvailablePlumbers = () => {
    if (userRole === "coordinator") {
      return plumbers.filter((plumber) => {
        const plumberId = String(plumber.id || plumber._id);
        return (
          assignedPlumberIds.some((id) => String(id) === plumberId) &&
          plumber.kyc_status === "approved"
        );
      });
    }
    return plumbers.filter((p) => p.kyc_status === "approved");
  };

  const getFilteredPlumbers = () => {
    if (!selectedInstallation) return [];
    
    const availablePlumbers = getAvailablePlumbers();
    
    const servicePins = availablePlumbers.filter((plumber) => {
      const servicePinList = Array.isArray(plumber.service_area_pin)
        ? plumber.service_area_pin.map((p) => p.trim())
        : [];
      return servicePinList.includes(selectedInstallation?.client?.pincode);
    });
    return servicePins;
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
        
        // Refresh installations
        const installationsRes = await axios.get(`${BACKEND_URL}/post-leads`);
        setInstallations(installationsRes.data);
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

    console.log("=== ASSIGNMENT DEBUG ===");
    console.log("Plumber ID being sent:", plumberId);
    console.log("Plumber ID type:", typeof plumberId);
    
    const plumber = plumbers.find((p) => p.id === plumberId || p._id === plumberId);
    console.log("Plumber object found:", plumber);

    setAssignLoading(true);

    try {
      const token = localStorage.getItem("authToken");
      const payload = {
        assigned_plumber_id: plumberId,
        status: "assigned",
        assigned_on: new Date().toISOString(),
      };

      console.log("Payload being sent:", payload);

      const response = await axios.put(
        `${BACKEND_URL}/post-leads/${selectedInstallation._id}/assign`,
        payload,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      console.log("Response from backend:", response.data);

      if (response.status === 200) {
        alert("Plumber assigned successfully!");
        setOpenAssignModal(false);
        setSelectedInstallation(null);
        setSelectedPlumber("");
        
        // Refresh installations
        const installationsRes = await axios.get(`${BACKEND_URL}/post-leads`);
        setInstallations(installationsRes.data);
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
      const token = localStorage.getItem("authToken");
      const response = await axios.put(
        `${BACKEND_URL}/post-leads/${installationId}/status-completed`,
        {
          status: "completed",
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (response.status === 200) {
        alert("Installation approved successfully!");
        
        // Refresh installations
        const installationsRes = await axios.get(`${BACKEND_URL}/post-leads`);
        setInstallations(installationsRes.data);
      }
    } catch (error) {
      console.error("Error approving installation:", error);
      alert("Failed to approve installation. Please try again.");
    }
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
      const token = localStorage.getItem("authToken");
      console.log("Reassigning to plumber ID:", newPlumberId);
      
      await axios.put(
        `${BACKEND_URL}/post-leads/${selectedInstallation._id}/reassign`,
        {
          status: 'assigned',
          assigned_plumber_id: newPlumberId,
          assigned_on: new Date().toISOString(),
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Plumber reassigned successfully!");
      setShowReassignModal(false);
      setNewPlumberId("");
      setSelectedInstallation(null);
      
      // Refresh installations
      const installationsRes = await axios.get(`${BACKEND_URL}/post-leads`);
      setInstallations(installationsRes.data);
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
      const token = localStorage.getItem("authToken");
      await axios.put(
        `${BACKEND_URL}/admin/installations/${installationId}/cancel`,
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      alert("Installation cancelled successfully!");
      
      // Refresh installations
      const installationsRes = await axios.get(`${BACKEND_URL}/post-leads`);
      setInstallations(installationsRes.data);
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

  if (loading) {
    return (
      <div className="loading-spinner">
        <Loader size={32} className="spinner-icon" />
        <p>Loading installations...</p>
      </div>
    );
  }

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

          {error ? (
            <p className="error-text">Failed to load installations</p>
          ) : openInstallations.length === 0 ? (
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
                  {openInstallations.map((installation) => (
                    <tr key={installation._id}>
                      <td className="installation-id">{installation._id}</td>
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

          {error ? (
            <p className="error-text">Failed to load installations</p>
          ) : inProgressInstallations.length === 0 ? (
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
                  {inProgressInstallations.map((installation) => (
                    <tr key={installation._id}>
                      <td className="installation-id">{installation._id}</td>
                      <td className="customer-name">
                        {installation.client?.name}
                      </td>
                      <td className="plumber">
                        {getPlumberName(installation.assigned_plumber_id)}
                      </td>
                      <td className="status-badge">
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

          {error ? (
            <p className="error-text">Failed to load installations</p>
          ) : completedInstallations.length === 0 ? (
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
                  {completedInstallations.map((installation) => (
                    <tr key={installation._id}>
                      <td className="installation-id">{installation._id}</td>
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
                        console.log("Dropdown changed to:", value);
                        setSelectedPlumber(value);
                      }}
                      className="assign-select"
                    >
                      <option value="">
                        Select manually or use suggestions ↓
                      </option>
                      {getAvailablePlumbers().map((plumber) => {
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

        {/* Reassign Plumber Modal */}
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
                    {getAvailablePlumbers()
                      .filter((p) => (p.id || p._id) !== selectedInstallation?.assigned_plumber_id)
                      .map((plumber) => (
                        <option key={plumber._id || plumber.id} value={plumber.id || plumber._id}>
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
      </div>
    </div>
  );
};

export default Installations;