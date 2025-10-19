import { useSelector } from "react-redux";
import "./InstallationQueue.css";

const InstallationQueue = () => {
  const { leads } = useSelector((state) => state.stats);
  const unassignedLeads = leads?.unassigned || [];

  return (
    <div className="installation-queue-container">
      <div className="header">
        <h3>Installation Queue</h3>
        <button>Manage</button>
      </div>

      <div className="table">
        {unassignedLeads.length === 0 ? (
          <p>No unassigned leads</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>ID</th>
                <th>Client Name</th>
                <th>Model</th>
                <th>Address</th>
              </tr>
            </thead>
            <tbody>
              {unassignedLeads.map((lead) => (
                <tr key={lead._id}>
                  <td>{lead._id}</td>
                  <td>{lead.client.name}</td>
                  <td>{lead.model_purchased}</td>
                  <td>{[lead.client.address, lead.client.city, lead.client.district, lead.client.state, lead.client.pincode].filter(Boolean).join(", ")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};
export default InstallationQueue;