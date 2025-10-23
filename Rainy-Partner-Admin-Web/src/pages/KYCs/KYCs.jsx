import React, { useState, useEffect } from "react";
import axios from "axios";
import { ClipboardCheck } from "lucide-react";
import "./KYCs.css";

const KYCs = () => {
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [rejectedApprovals, setRejectedApprovals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [signedUrls, setSignedUrls] = useState({});
  const backendUrl = import.meta.env.VITE_APP_BACKEND_URL;

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

        console.log("API Response - Pending:", pending);
        console.log("API Response - Rejected:", rejected);

        // Fetch full details for each KYC
        const fetchFullKYCDetails = async (kycList) => {
          return await Promise.all(
            kycList.map(async (kyc) => {
              const id = String(kyc._id?.$oid || kyc._id || kyc.id);
              try {
                const detailResponse = await axios.get(
                  `${backendUrl}/kyc/${id}`,
                  { headers: { Authorization: `Bearer ${token}` } }
                );
                return detailResponse.data || kyc;
              } catch (err) {
                console.error(`Failed to fetch details for ${id}:`, err);
                return kyc;
              }
            })
          );
        };

        const pendingWithDetails = await fetchFullKYCDetails(pending);
        const rejectedWithDetails = await fetchFullKYCDetails(rejected);

        setPendingApprovals(pendingWithDetails);
        setRejectedApprovals(rejectedWithDetails);

        const allKYCs = [...pendingWithDetails, ...rejectedWithDetails];
        const urls = {};

        console.log("KYC Objects with Details:", allKYCs);

        // Fetch all document URLs
        await Promise.all(
          allKYCs.map(async (kyc) => {
            const id = String(kyc._id?.$oid || kyc._id || kyc.id);
            if (!id || id === "undefined") {
              console.error("Invalid KYC ID:", kyc);
              return;
            }
            urls[id] = {};

            const docs = [
              { key: "aadhaar_front", name: "aadhaar_front" },
              { key: "aadhaar_back", name: "aadhaar_back" },
              { key: "license_front", name: "license_front" },
              { key: "license_back", name: "license_back" },
            ];

            await Promise.all(
              docs.map(async ({ key, name }) => {
                const fileKey = kyc[key];
                if (!fileKey) {
                  console.log(`No ${key} for KYC ${id}`);
                  return;
                }

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
                  urls[id][name] = signedUrl;
                  console.log(`✅ Fetched ${name} for ${id}:`, signedUrl);
                } catch (err) {
                  console.error(
                    `❌ Error fetching ${key}:`,
                    err.response?.data || err.message
                  );
                  urls[id][name] = null;
                }
              })
            );
          })
        );

        console.log("✅ Final Signed URLs:", urls);
        setSignedUrls(urls);
      } catch (err) {
        console.error("Error fetching KYC approvals:", err);
        setError("Failed to load KYC approvals");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [backendUrl]);

  const handleApprove = async (id) => {
    try {
      const res = await axios.post(`${backendUrl}/kyc/approve`, { id });
      setPendingApprovals((prev) => prev.filter((item) => item._id !== id));
      setRejectedApprovals((prev) => [
        ...prev,
        { ...res.data.data, status: "approved" },
      ]);
    } catch (err) {
      console.error("Error approving KYC:", err);
      setError("Failed to approve KYC");
    }
  };

  const handleReject = async (id) => {
    try {
      const res = await axios.post(`${backendUrl}/kyc/reject`, { id });
      setPendingApprovals((prev) => prev.filter((item) => item._id !== id));
      setRejectedApprovals((prev) => [
        ...prev,
        { ...res.data.data, status: "rejected" },
      ]);
    } catch (err) {
      console.error("Error rejecting KYC:", err);
      setError("Failed to reject KYC");
    }
  };

  const openDocument = (kycId, field) => {
    const url = signedUrls[String(kycId)]?.[field];
    console.log("Opening document:", { kycId, field, url });
    if (url) {
      window.open(url, "_blank");
    } else {
      alert("Document not available");
    }
  };

  if (loading) {
    return (
      <div className="kyc-page">
        <div className="kyc-container">
          <p className="loading-text">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="kyc-page">
      <div className="kyc-container">
        {error && <div className="error-text">{error}</div>}

        {/* ---------- Pending KYCs ---------- */}
        <div className="kyc-section">
          <div className="section-header">
            <ClipboardCheck size={20} />
            <h3>Pending KYC Approvals ({pendingApprovals.length})</h3>
          </div>

          {pendingApprovals.length === 0 ? (
            <p className="no-data-text">No pending KYCs</p>
          ) : (
            <div className="table-container">
              <table className="kyc-table">
                <thead>
                  <tr>
                    <th>Plumber</th>
                    <th>Address</th>
                    <th>Aadhaar Front</th>
                    <th>Aadhaar Back</th>
                    <th>License Front</th>
                    <th>License Back</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingApprovals.map((item) => {
                    const id = String(item._id?.$oid || item._id || item.id);
                    return (
                      <tr key={id}>
                        <td>{item.name}</td>
                        <td>
                          {item.address
                            ? `${item.address.address || ""}, ${
                                item.address.city || ""
                              }, ${item.address.district || ""}, ${
                                item.address.state || ""
                              }, ${item.address.pin || ""}`
                            : item.city || "N/A"}
                        </td>

                        {[
                          "aadhaar_front",
                          "aadhaar_back",
                          "license_front",
                          "license_back",
                        ].map((field) => (
                          <td key={field}>
                            {signedUrls[id]?.[field] ? (
                              <button
                                className="view-link"
                                onClick={() => openDocument(id, field)}
                              >
                                View
                              </button>
                            ) : (
                              "N/A"
                            )}
                          </td>
                        ))}

                        <td>
                          <span className="status-badge pending">Pending</span>
                        </td>
                        <td>
                          <button
                            className="assign-btn"
                            onClick={() =>
                              handleApprove(
                                item._id?.$oid || item._id || item.id
                              )
                            }
                          >
                            Approve
                          </button>
                          <button
                            className="reject-btn"
                            onClick={() =>
                              handleReject(
                                item._id?.$oid || item._id || item.id
                              )
                            }
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
                    <th>Plumber</th>
                    <th>City</th>
                    <th>Aadhaar Front</th>
                    <th>Aadhaar Back</th>
                    <th>License Front</th>
                    <th>License Back</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {rejectedApprovals.map((item) => {
                    const id = String(item._id?.$oid || item._id || item.id);
                    return (
                      <tr key={id}>
                        <td>{item.name}</td>
                        <td>{item.address?.city || "N/A"}</td>

                        {[
                          "aadhaar_front",
                          "aadhaar_back",
                          "license_front",
                          "license_back",
                        ].map((field) => (
                          <td key={field}>
                            {signedUrls[id]?.[field] ? (
                              <button
                                className="view-link"
                                onClick={() => openDocument(id, field)}
                              >
                                View
                              </button>
                            ) : (
                              "N/A"
                            )}
                          </td>
                        ))}

                        <td>
                          <span
                            className={`status-badge ${
                              item.status === "approved"
                                ? "approved"
                                : "rejected"
                            }`}
                          >
                            {item.status === "approved"
                              ? "Approved"
                              : "Rejected"}
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
    </div>
  );
};

export default KYCs;
