import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Filter,
  MapPin,
  Users,
  ChevronDown,
  ChevronUp,
  Search,
  X,
  Trash2,
  Loader,
} from "lucide-react";
import "./Plumbers.css";

const Plumbers = () => {
  const [plumbers, setPlumbers] = useState([]);
  const [coordinator, setCoordinator] = useState([]);
  const [leads, setLeads] = useState([]);
  const [filters, setFilters] = useState({
    state: "",
    district: "",
    city: "",
    search: "",
  });
  const [filteredPlumbers, setFilteredPlumbers] = useState([]);
  const [plumberImages, setPlumberImages] = useState({});
  const [states, setStates] = useState([]);
  const [allDistricts, setAllDistricts] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedStates, setExpandedStates] = useState({});
  const [expandedDistricts, setExpandedDistricts] = useState({});
  const [expandedCities, setExpandedCities] = useState({});
    const [selectedPlumber, setSelectedPlumber] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);

  const BACKEND_URL = import.meta.env.VITE_APP_BACKEND_URL;
  const token = localStorage.getItem("authToken");

  useEffect(() => {
    if (!token) {
      setError("Authentication token not found");
      setLoading(false);
      return;
    }

    const fetchData = async () => {
      try {
        const [filterRes, coordRes, plumbersRes, leadsRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/admin/plumbers/filters`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${BACKEND_URL}/admin/co-ordinators`, {
            headers: { Authorization: `Bearer ${token}`}
          }),
          axios.get(`${BACKEND_URL}/admin/plumbers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${BACKEND_URL}/post-leads`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const fetchedStates = filterRes.data.states || [];
        const fetchedDistricts = filterRes.data.districts || [];
        const fetchedCoordinators = coordRes.data.coordinators;
        const fetchedCities = filterRes.data.cities || [];
        const fetchedPlumbers = plumbersRes.data.plumbers || [];
        const fetchedLeads = leadsRes.data.installations || leadsRes.data || [];

        setStates(fetchedStates);
        setPlumbers(fetchedPlumbers);
        setCoordinator(fetchedCoordinators);
        setLeads(fetchedLeads);

        const plumberDistricts = new Set(
          fetchedDistricts.map((d) => d.name?.trim())
        );
        const plumberCities = new Set(fetchedCities.map((c) => c.name?.trim()));

        fetchedPlumbers.forEach((p) => {
          const { state, district, city } = p.address || {};
          const d = district?.trim();
          const c = city?.trim();

          if (d && !plumberDistricts.has(d)) {
            plumberDistricts.add(d);
            fetchedDistricts.push({ name: d, state });
          }

          if (c && !plumberCities.has(c)) {
            plumberCities.add(c);
            fetchedCities.push({ name: c, state, district });
          }
        });

        setAllDistricts(fetchedDistricts);
        setAllCities(fetchedCities);
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError("Failed to fetch plumbers or filters");
        setLoading(false);
      }
    };

    fetchData();
  }, [BACKEND_URL, token]);

useEffect(() => {
  const fetchImages = async () => {
    // Filter plumbers that have profile images
    const plumbersWithProfiles = plumbers.filter(p => p.profile);
    
    if (plumbersWithProfiles.length === 0) {
      return;
    }

    try {
      // Single API call with all keys
      const keys = plumbersWithProfiles.map(p => p.profile);
      
      const res = await axios.post(
        `${BACKEND_URL}/admin/get-multiple-plumber-profiles`,
        { keys },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Map URLs back to plumber IDs
      const images = {};
      plumbersWithProfiles.forEach((plumber) => {
        const imageUrl = res.data.urls[plumber.profile];
        if (imageUrl) {
          images[plumber.id] = imageUrl;
        }
      });

      console.log("Fetched all images in one request:", images);
      setPlumberImages(images);
    } catch (err) {
      console.error("Error fetching plumber images:", err);
    }
  };

  if (plumbers.length) fetchImages();
}, [plumbers, BACKEND_URL, token]);

  useEffect(() => {
    let filteredDistricts = [];

    if (filters.state) {
      filteredDistricts = allDistricts
        .filter((d) => d.state === filters.state)
        .map((d) => d.name?.trim());
    } else {
      filteredDistricts = allDistricts.map((d) => d.name?.trim());
    }

    const uniqueSortedDistricts = Array.from(new Set(filteredDistricts))
      .filter(Boolean)
      .sort();

    setDistricts(uniqueSortedDistricts);
    setFilters((prev) => ({ ...prev, district: "", city: "" }));
    setCities([]);
  }, [filters.state, allDistricts]);

  useEffect(() => {
    let filteredCities = [];

    if (filters.district) {
      filteredCities = allCities
        .filter(
          (c) => c.state === filters.state && c.district === filters.district
        )
        .map((c) => c.name?.trim());
    } else if (filters.state) {
      filteredCities = allCities
        .filter((c) => c.state === filters.state)
        .map((c) => c.name?.trim());
    } else {
      filteredCities = allCities.map((c) => c.name?.trim());
    }

    const uniqueSortedCities = Array.from(new Set(filteredCities))
      .filter(Boolean)
      .sort();

    setCities(uniqueSortedCities);
    setFilters((prev) => ({ ...prev, city: "" }));
  }, [filters.state, filters.district, allCities]);

  useEffect(() => {
    const normalize = (val) => val?.toLowerCase().trim() || "";
    const search = normalize(filters.search);

    const filtered = plumbers.filter((plumber) => {
      const { state, district, city } = plumber.address || {};
      return (
        (filters.state === "" ||
          normalize(state) === normalize(filters.state)) &&
        (filters.district === "" ||
          normalize(district) === normalize(filters.district)) &&
        (filters.city === "" || normalize(city) === normalize(filters.city)) &&
        (search === "" ||
          plumber.name?.toLowerCase().includes(search) ||
          plumber.phone?.includes(search))
      );
    });

    setFilteredPlumbers(filtered);
  }, [filters, plumbers]);

  const handleChange = (e) => {
    setFilters({ ...filters, [e.target.name]: e.target.value });
  };

  const handleClear = () => {
    setFilters({
      state: "",
      district: "",
      city: "",
      search: "",
    });
  };

  const toggleStateExpand = (state) => {
    setExpandedStates((prev) => ({
      ...prev,
      [state]: !prev[state],
    }));
  };

  const toggleDistrictExpand = (district) => {
    setExpandedDistricts((prev) => ({
      ...prev,
      [district]: !prev[district],
    }));
  };

  const toggleCityExpand = (city) => {
    setExpandedCities((prev) => ({
      ...prev,
      [city]: !prev[city],
    }));
  };

  const getAssignedPlumbers = () => {
    const assignedLeads = leads.filter(
      (lead) =>
        lead.assigned_plumber_id &&
        (lead.status === "assigned" || lead.status === "under_review")
    );

    const assignedPlumbersData = assignedLeads
      .map((lead) => {
        const plumber = filteredPlumbers.find(
          (p) => String(p.id) === String(lead.assigned_plumber_id)
        );

        if (plumber) {
          return {
            ...plumber,
            installation_id: lead._id || lead.id,
            installation_status: lead.status,
          };
        }
        return null;
      })
      .filter(Boolean);

    return assignedPlumbersData;
  };

  const getPlumberStatus = (status) => {
    if (status === "assigned") {
      return "Assigned";
    } else if (status === "under_review") {
      return "Under Review";
    }
    return "In Progress";
  };

  const getGroupedPlumbers = () => {
    const approved = filteredPlumbers.filter(
      (p) => p.kyc_status === "approved"
    );

    const grouped = {};

    approved.forEach((plumber) => {
      const state = plumber.address?.state || "Unknown";
      const district = plumber.address?.district || "Unknown";
      const city = plumber.address?.city || "Unknown";

      if (!grouped[state]) {
        grouped[state] = {};
      }
      if (!grouped[state][district]) {
        grouped[state][district] = {};
      }
      if (!grouped[state][district][city]) {
        grouped[state][district][city] = [];
      }
      grouped[state][district][city].push(plumber);
    });

    return grouped;
  };

  const openPlumberModal = (plumber) => {
    setSelectedPlumber(plumber);
    setIsModalOpen(true);
  };

  const closePlumberModal = () => {
    setSelectedPlumber(null);
    setIsModalOpen(false);
  };

  const getTotalJobsForPlumber = (plumberId) => {
    if (!plumberId || !leads || leads.length === 0) {
      return 0;
    }

    const count = leads.filter((lead) => {
      return (
        lead.assigned_plumber_id &&
        String(lead.assigned_plumber_id) === String(plumberId)
      );
    }).length;

    return count;
  };

const getCoordName = (id) => {
  const coord = coordinator.find((c) => c._id === id);
  return coord ? `${coord.name} (${coord.phone})` : 'N/A';
};


  const getCurrentJobForPlumber = (plumberId) => {
    if (!plumberId || !leads || leads.length === 0) {
      return null;
    }

    const currentJob = leads.find((lead) => {
      return (
        lead.assigned_plumber_id &&
        String(lead.assigned_plumber_id) === String(plumberId) &&
        (lead.status === "assigned" || lead.status === "under_review")
      );
    });

    return currentJob;
  };

  const assignedPlumbers = getAssignedPlumbers();
  const groupedPlumbers = getGroupedPlumbers();

  if (loading)
    return (
        <div className="loading-spinner">
            <Loader size={32} className="spinner-icon" />
        <p>Loading plumbers...</p>
      </div>
    );

  if (error)
    return (
      <div className="plumbers-error">
        <p>{error}</p>
      </div>
    );

  return (
    <div className="plumbers-page">
      <div className="plumbers-container">
        {/* Filters Section */}
        <div className="filters-section">
          <div className="filters-header">
            <div className="filters-title">
              <Filter size={18} />
              <span>Filters & Search</span>
            </div>
            <span className="plumber-count">
              {
                filteredPlumbers.filter((p) => p.kyc_status === "approved")
                  .length
              }{" "}
              plumbers
            </span>
          </div>

          <div className="filters-grid">
            <div className="filter-group">
              <label>State</label>
              <select
                name="state"
                value={filters.state}
                onChange={handleChange}
              >
                <option value="">All</option>
                {states.sort().map((state) => (
                  <option key={state} value={state}>
                    {state}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>District</label>
              <select
                name="district"
                value={filters.district}
                onChange={handleChange}
              >
                <option value="">All</option>
                {districts.map((district) => (
                  <option key={district} value={district}>
                    {district}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group">
              <label>City</label>
              <select name="city" value={filters.city} onChange={handleChange}>
                <option value="">All</option>
                {cities.map((city) => (
                  <option key={city} value={city}>
                    {city}
                  </option>
                ))}
              </select>
            </div>

            <div className="filter-group search-group">
              <label>Search</label>
              <div className="search-input-wrapper">
                <Search size={18} className="search-icon" />
                <input
                  type="text"
                  name="search"
                  placeholder="Search by name / phone"
                  value={filters.search}
                  onChange={handleChange}
                />
              </div>
            </div>

            <button className="clear-btn" onClick={handleClear}>
              Clear
            </button>
          </div>
        </div>

        {/* Currently Assigned Plumbers */}
        {assignedPlumbers.length > 0 && (
          <div className="assigned-section">
            <div className="section-header">
              <MapPin size={20} />
              <h3>Currently Assigned Plumbers</h3>
            </div>

            <div className="assigned-label">In Progress</div>

            <div className="assigned-table-container">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>Plumber</th>
                    <th>City</th>
                    <th>Assigned Co-Ordinator</th>
                    <th>Installation</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedPlumbers.map((plumber) => {
                    const status = getPlumberStatus(
                      plumber.installation_status
                    );
                    return (
                      <tr key={`${plumber.id}-${plumber.installation_id}`}>
                        <td>
                          <button className="plumber-link" onClick={() => {openPlumberModal(plumber)}}>
                            {plumber.name}
                          </button>
                        </td>
                        <td>{plumber.address?.city || "N/A"}</td>
                        <td>{plumber.coordinator_id || "N/A"}</td>
                        <td>{plumber.installation_id || "N/A"}</td>
                        <td>
                          <span className="status-badge status-in-progress">
                            {status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Grouped Plumbers Section */}
        <div className="grouped-section">
          <div className="section-header">
            <Users size={20} />
            <h3>Plumbers (Approved) — Grouped by State/District/City</h3>
          </div>

          <div className="grouped-list">
            {Object.keys(groupedPlumbers)
              .sort()
              .map((state) => (
                <div key={state} className="accordion-group state-group">
                  <div
                    className="accordion-header"
                    onClick={() => toggleStateExpand(state)}
                  >
                    <span className="accordion-title">{state}</span>
                    {expandedStates[state] ? (
                      <ChevronUp size={20} />
                    ) : (
                      <ChevronDown size={20} />
                    )}
                  </div>

                  {expandedStates[state] && (
                    <div className="accordion-content">
                      {Object.keys(groupedPlumbers[state])
                        .sort()
                        .map((district) => (
                          <div
                            key={district}
                            className="accordion-group district-group"
                          >
                            <div
                              className="accordion-header"
                              onClick={() =>
                                toggleDistrictExpand(`${state}-${district}`)
                              }
                            >
                              <span className="accordion-title">
                                {district}
                              </span>
                              {expandedDistricts[`${state}-${district}`] ? (
                                <ChevronUp size={18} />
                              ) : (
                                <ChevronDown size={18} />
                              )}
                            </div>

                            {expandedDistricts[`${state}-${district}`] && (
                              <div className="accordion-content">
                                {Object.keys(groupedPlumbers[state][district])
                                  .sort()
                                  .map((city) => (
                                    <div
                                      key={city}
                                      className="accordion-group city-group"
                                    >
                                      <div
                                        className="accordion-header"
                                        onClick={() =>
                                          toggleCityExpand(
                                            `${state}-${district}-${city}`
                                          )
                                        }
                                      >
                                        <span className="accordion-title">
                                          {city} (
                                          {
                                            groupedPlumbers[state][district][
                                              city
                                            ].length
                                          }
                                          )
                                        </span>
                                        {expandedCities[
                                          `${state}-${district}-${city}`
                                        ] ? (
                                          <ChevronUp size={16} />
                                        ) : (
                                          <ChevronDown size={16} />
                                        )}
                                      </div>

                                      {expandedCities[
                                        `${state}-${district}-${city}`
                                      ] && (
                                        <div className="accordion-content">
                                          <table className="modern-table plumbers-table">
                                            <thead>
                                              <tr>
                                                <th>ID</th>
                                                <th>Plumber</th>
                                                <th>Co-Ordinator</th>
                                                <th>Jobs</th>
                                                <th>Rating</th>
                                                <th>Assigned</th>
                                                <th>Delete</th>
                                              </tr>
                                            </thead>
                                            <tbody>
                                              {groupedPlumbers[state][district][
                                                city
                                              ].map((plumber) => {
                                                const currentJob =
                                                  getCurrentJobForPlumber(
                                                    plumber.id
                                                  );
                                                return (
                                                  <tr key={plumber.id}>
                                                    <td className="plumber-id-cell">
                                                      {plumber.plumber_id ||
                                                        plumber.id
                                                          .slice(-6)
                                                          .toUpperCase()}
                                                    </td>
                                                    <td>
                                                      <div className="plumber-info">
                                                        <div className="plumber-avatar">
                                                          {plumberImages[
                                                            plumber.id
                                                          ] ? (
                                                            <img
                                                              src={
                                                                plumberImages[
                                                                  plumber.id
                                                                ]
                                                              }
                                                              alt={plumber.name}
                                                            />
                                                          ) : (
                                                            <div className="avatar-placeholder">
                                                              {plumber.name
                                                                ?.charAt(0)
                                                                .toUpperCase() ||
                                                                "P"}
                                                            </div>
                                                          )}
                                                        </div>
                                                        <div className="plumber-details">
                                                          <div className="plumber-name">
                                                            <button onClick={() => {openPlumberModal(plumber)}} className="name-button">{plumber.name}</button>
                                                          </div>
                                                          <div className="plumber-phone">
                                                            {plumber.phone}
                                                          </div>
                                                        </div>
                                                      </div>
                                                    </td>
                                                    <td>{getCoordName(plumber.coordinator_id)}</td>
                                                    <td className="jobs-cell">
                                                      {getTotalJobsForPlumber(
                                                        plumber.id
                                                      )}
                                                    </td>
                                                    <td className="rating-cell">
                                                      <span className="rating-star">
                                                        ★
                                                      </span>
                                                      <span className="rating-value">
                                                        {plumber.trust || 0}
                                                      </span>
                                                    </td>
                                                    <td>
                                                      {currentJob ? (
                                                        <div className="assigned-info">
                                                          <span className="status-badge status-in-progress">
                                                            In Progress
                                                          </span>
                                                          <span className="installation-id">
                                                            {currentJob._id ||
                                                              currentJob.id}
                                                          </span>
                                                        </div>
                                                      ) : (
                                                        <span className="no-assignment">
                                                          —
                                                        </span>
                                                      )}
                                                    </td>
                                                    <td className="delete-cell">
                                                      <button className="delete-btn">
                                                        <Trash2 size={16} />
                                                        Delete
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
                                  ))}
                              </div>
                            )}
                          </div>
                        ))}
                    </div>
                  )}
                </div>
              ))}

            {Object.keys(groupedPlumbers).length === 0 && (
              <p className="no-plumbers">No approved plumbers found</p>
            )}

            
          </div>
        </div>

        
      </div>

      {isModalOpen && selectedPlumber && (
              <div className="modal-overlay" onClick={closePlumberModal}>
                <div
                  className="modal-container"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="modal-header">
                    <h3>KYC Details — {selectedPlumber.name}</h3>
                    <button className="close-btn" onClick={closePlumberModal}>
                      <X size={24} />
                    </button>
                  </div>
                  <div className="modal-body">
                    {/* Profile Section */}
                    <div className="modal-profile-section">
                      <div className="modal-avatar-container">
                        <div className="modal-plumber-avatar">
                          {plumberImages[selectedPlumber.id] ? (
                            <img
                              src={plumberImages[selectedPlumber.id]}
                              alt={selectedPlumber.name}
                            />
                          ) : (
                            <div className="modal-avatar-placeholder">
                              {selectedPlumber.name?.charAt(0).toUpperCase() || "P"}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="modal-profile-info">
                        <h2 className="modal-plumber-name">{selectedPlumber.name}</h2>
                        <div className="modal-plumber-contact">
                          <span>{selectedPlumber.email || "No email provided"}</span>
                          <span>{selectedPlumber.phone}</span>
                        </div>
                      </div>
                    </div>
      
                    {/* Details Grid */}
                    <div className="modal-details-grid">
                      <div className="modal-detail-card">
                        <div className="modal-detail-label">License</div>
                        <div className="modal-detail-value">
                          {selectedPlumber.plumber_license_number || "N/A"}
                        </div>
                      </div>
                      <div className="modal-detail-card">
                        <div className="modal-detail-label">Aadhaar Number</div>
                        <div className="modal-detail-value">
                          {selectedPlumber.aadhaar_number || "N/A"}
                        </div>
                      </div>
                      <div className="modal-detail-card">
                        <div className="modal-detail-label">KYC Status</div>
                        <div className="modal-detail-value">
                          {selectedPlumber.kyc_status === 'approved' ? 'Approved' : "N/A"}
                        </div>
                      </div>
                      <div className="modal-detail-card">
                        <div className="modal-detail-label">Experience</div>
                        <div className="modal-detail-value">
                          {selectedPlumber.experience || "N/A"}
                        </div>
                      </div>
                      <div className="modal-detail-card">
                        <div className="modal-detail-label">Total Jobs</div>
                        <div className="modal-detail-value">
                          {getTotalJobsForPlumber(selectedPlumber.id)}
                        </div>
                      </div>
                      <div className="modal-detail-card">
                        <div className="modal-detail-label">Rating</div>
                        <div className="modal-detail-value">
                          ★ {selectedPlumber.trust || 0}
                        </div>
                      </div>
                    </div>
      
                    {/* Address Section */}
                    <h3 className="modal-section-title">Address</h3>
                    <div className="modal-address-text">
                      {selectedPlumber.address?.address}
                      {selectedPlumber.address?.city || ""}, {selectedPlumber.address?.district || ""}, {selectedPlumber.address?.state || ""} — {selectedPlumber.address?.pin || ""}
                    </div>
      
                    <h3 className="modal-section-title">Service Area Pincodes</h3>
                    <div className="modal-address-text">
                      {selectedPlumber.service_area_pin}
                    </div>
      
                    {/* Documents Section */}
      {/* 📄 Documents Section */}
      <h3 className="modal-section-title">Documents</h3>
      <div className="modal-documents-list">
        {[
          { key: "aadhaar_front", label: "Aadhaar Front" },
          { key: "aadhaar_back", label: "Aadhaar Back" },
          { key: "license_front", label: "License Front" },
          { key: "license_back", label: "License Back" },
        ].map(({ key, label }) => {
          const docKey = selectedPlumber[key];
          if (!docKey) return null;
          return (
            <div key={key} className="modal-document-item">
              <span className="modal-document-name">{label}</span>
              <button
                className="modal-document-link"
                onClick={async () => {
                  try {
                    const token = localStorage.getItem("authToken");
                    const res = await axios.post(
                      `${BACKEND_URL}/installations/get-image`,
                      { key: docKey },
                      { headers: { Authorization: `Bearer ${token}` } }
                    );
                    const signedUrl =
                      res.data?.url ||
                      res.data?.data?.url ||
                      res.data?.signedUrl ||
                      null;
      
                    if (signedUrl) {
                      window.open(signedUrl, "_blank");
                    } else {
                      alert("Could not get signed URL for this document.");
                    }
                  } catch (error) {
                    console.error("Error fetching signed URL:", error);
                    alert("Failed to open document.");
                  }
                }}
              >
                View
              </button>
            </div>
          );
        })}
      
        {/* If no docs available */}
        {!selectedPlumber.aadhaar_front &&
          !selectedPlumber.aadhaar_back &&
          !selectedPlumber.license_front &&
          !selectedPlumber.license_back && (
            <div className="modal-document-item">
              <span
                className="modal-document-name"
                style={{ color: "#9ca3af" }}
              >
                No documents available
              </span>
            </div>
          )}
      </div>
      
                  </div>
                </div>
              </div>
            )}
    </div>
  );
};

export default Plumbers;
