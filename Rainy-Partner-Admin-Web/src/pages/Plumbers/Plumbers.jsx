import React, { useState, useEffect } from "react";
import axios from "axios";
import { Filter, MapPin, Users, ChevronDown, Search, X } from "lucide-react";
import "./Plumbers.css";

const Plumbers = () => {
  const [plumbers, setPlumbers] = useState([]);
  const [filters, setFilters] = useState({
    state: "",
    district: "",
    city: "",
    search: "",
  });
  const [filteredPlumbers, setFilteredPlumbers] = useState([]);
  const [states, setStates] = useState([]);
  const [allDistricts, setAllDistricts] = useState([]);
  const [allCities, setAllCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [cities, setCities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedStates, setExpandedStates] = useState({});

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
        const [filterRes, plumbersRes] = await Promise.all([
          axios.get(`${BACKEND_URL}/admin/plumbers/filters`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          axios.get(`${BACKEND_URL}/admin/plumbers`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        const fetchedStates = filterRes.data.states || [];
        const fetchedDistricts = filterRes.data.districts || [];
        const fetchedCities = filterRes.data.cities || [];
        const fetchedPlumbers = plumbersRes.data.plumbers || [];

        setStates(fetchedStates);
        setPlumbers(fetchedPlumbers);

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

  const getAssignedPlumbers = () => {
    return filteredPlumbers.filter((p) => p.current_installation);
  };

  const getGroupedPlumbers = () => {
    const approved = filteredPlumbers.filter(
      (p) => p.kyc_status === "approved" && !p.current_installation
    );
    const grouped = {};

    approved.forEach((plumber) => {
      const state = plumber.address?.state || "Unknown";
      if (!grouped[state]) {
        grouped[state] = [];
      }
      grouped[state].push(plumber);
    });

    return grouped;
  };

  const assignedPlumbers = getAssignedPlumbers();
  const groupedPlumbers = getGroupedPlumbers();

  if (loading)
    return (
      <div className="plumbers-loading">
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
        <div className="filters-section">
          <div className="filters-header">
            <div className="filters-title">
              <Filter size={18} />
              <h3>Filters & Search</h3>
            </div>
            <span className="plumber-count">
              {filteredPlumbers.filter(p => p.kyc_status === 'approved').length} plumbers
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
                <option value="">All States</option>
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
                <option value="">All Districts</option>
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
                <option value="">All Cities</option>
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

        <div className="assigned-section">
  <div className="section-header">
    <MapPin size={20} />
    <h3>Currently Assigned Plumbers</h3>
  </div>

  <div className="assigned-label">Assigned / In Progress</div>

  <div className="assigned-table-container">
    <table className="assigned-table">
      <thead>
        <tr>
          <th>Plumber</th>
          <th>City</th>
          <th>Installation</th>
          <th>Status</th>
        </tr>
      </thead>
      <tbody>
        {assignedPlumbers.map((plumber) => (
          <tr key={plumber._id}>
            <td><a href="#" className="plumber-link">{plumber.name}</a></td>
            <td>{plumber.address?.city || "N/A"}</td>
            <td>{plumber.current_installation || "N/A"}</td>
            <td>
              <span className={`status-badge ${plumber.displayStatus === "In Progress" ? "status-in-progress" : "status-assigned"}`}>
                {plumber.displayStatus}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
</div>


        {assignedPlumbers.length > 0 && (
          <div className="assigned-section">
            <div className="section-header">
              <MapPin size={20} />
              <h3>Currently Assigned Plumbers</h3>
            </div>

            <div className="assigned-label">In Progress</div>

            <div className="assigned-table-container">
              <table className="assigned-table">
                <thead>
                  <tr>
                    <th>Plumber</th>
                    <th>City</th>
                    <th>Installation</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedPlumbers.map((plumber) => (
                    <tr key={plumber._id}>
                      <td>
                        <a href="#" className="plumber-link">
                          {plumber.name}
                        </a>
                      </td>
                      <td>{plumber.address?.city || "N/A"}</td>
                      <td>{plumber.current_installation || "N/A"}</td>
                      <td>
                        <span className="status-badge status-in-progress">
                          In Progress
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {assignedPlumbers.length > 0 && (
          <div className="assigned-section">
            <div className="section-header">
              <MapPin size={20} />
              <h3>Plumbers Currently Assigned to Installations</h3>
            </div>

            <div className="assigned-label">Assigned / In Progress</div>

            <div className="assigned-table-container">
              <table className="assigned-table">
                <thead>
                  <tr>
                    <th>Plumber</th>
                    <th>City</th>
                    <th>Installation</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {assignedPlumbers.map((plumber) => (
                    <tr key={plumber._id}>
                      <td>
                        <a href="#" className="plumber-link">
                          {plumber.name}
                        </a>
                      </td>
                      <td>{plumber.address?.city || "N/A"}</td>
                      <td>{plumber.current_installation || "N/A"}</td>
                      <td>
                        <span
                          className={`status-badge ${
                            plumber.displayStatus === "In Progress"
                              ? "status-in-progress"
                              : "status-assigned"
                          }`}
                        >
                          {plumber.displayStatus}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <div className="grouped-section">
          <div className="section-header">
            <Users size={20} />
            <h3>Plumbers (Approved) — Grouped by State/District/City</h3>
          </div>

          <div className="grouped-list">
            {Object.keys(groupedPlumbers)
              .sort()
              .map((state) => (
                <div key={state} className="state-group">
                  <div
                    className="state-header"
                    onClick={() => toggleStateExpand(state)}
                  >
                    <span>{state}</span>
                    <ChevronDown
                      size={20}
                      className={`chevron ${
                        expandedStates[state] ? "expanded" : ""
                      }`}
                    />
                  </div>

                  {expandedStates[state] && (
                    <div className="state-content">
                      {groupedPlumbers[state].map((plumber) => (
                        <div key={plumber._id} className="plumber-item">
                          <div className="plumber-info">
                            <h4>{plumber.name}</h4>
                            <p>{plumber.phone}</p>
                          </div>
                          <div className="plumber-location">
                            <span>{plumber.address?.city || "N/A"}</span>
                            <span>•</span>
                            <span>{plumber.address?.district || "N/A"}</span>
                          </div>
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
    </div>
  );
};

export default Plumbers;
