import React, { useState, useEffect } from "react";

function extractTicketNumber(url) {
  if (!url) return "";
  // Extract last path segment (e.g., WEBOS4TV-70351 from a JIRA URL)
  const match = url.match(/\/([A-Z][A-Z0-9]+-\d+)\s*$/i) || url.match(/([A-Z][A-Z0-9]+-\d+)\s*$/i);
  return match ? match[1] : url;
}

export default function CCCStatusDetails({ onBack }) {
  const [history, setHistory] = useState([]);
  const [statusFilter, setStatusFilter] = useState("all");
  const [branchFilter, setBranchFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 3000);
    return () => clearInterval(interval);
  }, []);

  // Reset page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, branchFilter, searchQuery]);

  const loadHistory = () => {
    fetch("http://localhost:5000/api/ccc")
      .then((res) => res.json())
      .then((data) => {
        setHistory(data);
      })
      .catch((err) => console.error("Failed to load data:", err));
  };

  // Return early if no data (after all hooks)
  if (history.length === 0) {
    return (
      <main className="ccc-status-shell">
        <header className="ccc-status-header">
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>CCC taxi : MS System App Solution</p>
            <h1>Status Overview</h1>
          </div>
          <button className="primary-button" type="button" onClick={onBack}>
            ← Back
          </button>
        </header>
        <div style={{ padding: "20px", textAlign: "center" }}>
          <p>No data available yet.</p>
        </div>
      </main>
    );
  }

  const selectedRecord = history[history.length - 1];

  // Collect all items with their statuses and branches
  const allItems = [];
  Object.entries(selectedRecord.branchEntries || {}).forEach(([branch, items]) => {
    items.forEach((item) => {
      allItems.push({ ...item, branch });
    });
  });

  // Apply filters and search
  const filtered = allItems.filter((item) => {
    const statusMatch = statusFilter === "all" || item.status === statusFilter;
    const branchMatch = branchFilter === "all" || item.branch === branchFilter;
    const searchMatch = 
      item.appName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (item.tag && item.tag.toLowerCase().includes(searchQuery.toLowerCase()));
    return statusMatch && branchMatch && searchMatch;
  });

  // Pagination
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedItems = filtered.slice(startIndex, startIndex + itemsPerPage);

  // Status counts
  const statusCounts = {
    open: allItems.filter((i) => i.status === "open").length,
    inprogress: allItems.filter((i) => i.status === "inprogress").length,
    cccstarted: allItems.filter((i) => i.status === "cccstarted").length,
    closed: allItems.filter((i) => i.status === "closed").length,
  };

  const getStatusBadgeColor = (status) => {
    switch (status) {
      case "open":
        return "#4CAF50";
      case "inprogress":
        return "#FFC107";
      case "cccstarted":
        return "#2196F3";
      case "closed":
        return "#9C27B0";
      default:
        return "#999";
    }
  };

  const getStatusLabel = (status) => {
    return status === "inprogress" ? "In Progress" : status === "cccstarted" ? "CCC Started" : status.charAt(0).toUpperCase() + status.slice(1);
  };

  const deleteOpenEntry = (appName, branch) => {
    if (!window.confirm(`Delete "${appName}" from ${branch}? This action cannot be undone.`)) {
      return;
    }

    fetch("http://localhost:5000/api/ccc")
      .then((res) => res.json())
      .then((data) => {
        if (data.length === 0) return;
        const latestRecord = data[data.length - 1];
        const updatedEntries = {
          ...latestRecord.branchEntries,
          [branch]: (latestRecord.branchEntries[branch] || []).filter(
            (item) => !(item.appName === appName && item.status === "open")
          ),
        };

        fetch("http://localhost:5000/api/ccc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branchEntries: updatedEntries, branchMeta: latestRecord.branchMeta || {} }),
        })
          .then((res) => res.json())
          .then((result) => {
            if (result.ok) {
              loadHistory();
            }
          })
          .catch((err) => console.error("Delete failed:", err));
      })
      .catch((err) => console.error("Failed to fetch data:", err));
  };

  return (
    <main className="ccc-status-shell">
      {/* Header */}
      <header className="ccc-status-header">
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>CCC taxi : MS System App Solution</p>
          <h1>Status Overview</h1>
        </div>
        <button className="primary-button" type="button" onClick={onBack}>
          ← Back
        </button>
      </header>

      {/* Summary stats */}
      <section className="ccc-stats">
        <article className="ccc-stat">
          <span>Total Apps</span>
          <strong>{allItems.length}</strong>
        </article>
        <article className="ccc-stat">
          <span>Open</span>
          <strong style={{ color: "#4CAF50" }}>{statusCounts.open}</strong>
        </article>
        <article className="ccc-stat">
          <span>In Progress</span>
          <strong style={{ color: "#FFC107" }}>{statusCounts.inprogress}</strong>
        </article>
        <article className="ccc-stat">
          <span>CCC Started</span>
          <strong style={{ color: "#2196F3" }}>{statusCounts.cccstarted}</strong>
        </article>
        <article className="ccc-stat">
          <span>Closed</span>
          <strong style={{ color: "#9C27B0" }}>{statusCounts.closed}</strong>
        </article>
      </section>

      {/* Filters and Search */}
      <section className="ccc-filters">
        <div className="filter-group" style={{ flex: "2", minWidth: "250px" }}>
          <label>
            <span>Search by App Name or Tag:</span>
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="ccc-search-input"
            />
          </label>
        </div>
        <div className="filter-group">
          <label>
            <span>Status:</span>
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">All Statuses</option>
              <option value="open">Open</option>
              <option value="inprogress">In Progress</option>
              <option value="cccstarted">CCC Started</option>
              <option value="closed">Closed</option>
            </select>
          </label>
        </div>
        <div className="filter-group">
          <label>
            <span>Branch:</span>
            <select value={branchFilter} onChange={(e) => setBranchFilter(e.target.value)}>
              <option value="all">All Branches</option>
              <option value="webos4media">webos4media</option>
              <option value="que4media">que4media</option>
            </select>
          </label>
        </div>
      </section>

      {/* Items table */}
      <section className="ccc-items-section">
        {filtered.length === 0 ? (
          <div style={{ padding: "40px 20px", textAlign: "center" }}>
            <p>No items match the selected filters.</p>
          </div>
        ) : (
          <>
            <div className="ccc-table-wrap">
              <table className="ccc-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Branch</th>
                    <th>App Name</th>
                    <th>Tag</th>
                    <th>Status</th>
                    <th>Ticket Link</th>
                    <th>Started Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedItems.map((item, index) => (
                    <tr key={`${item.appName}-${startIndex + index}`}>
                      <td className="ccc-cell-num">{startIndex + index + 1}</td>
                      <td>
                        <span className="ccc-badge">{item.branch}</span>
                      </td>
                      <td>
                        <code className="ccc-code">{item.appName}</code>
                      </td>
                      <td>
                        <span className="ccc-version-chip">{item.tag || "N/A"}</span>
                      </td>
                      <td>
                        <span
                          className="ccc-status-badge"
                          style={{ backgroundColor: getStatusBadgeColor(item.status), color: "white" }}
                        >
                          {getStatusLabel(item.status)}
                        </span>
                      </td>
                      <td>
                        {item.cccTicketLink ? (
                          <a href={item.cccTicketLink} target="_blank" rel="noopener noreferrer" className="ccc-link">
                            {extractTicketNumber(item.cccTicketLink)}
                          </a>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="ccc-cell-date">
                        {item.cccStartedDate ? new Date(item.cccStartedDate).toLocaleString() : "—"}
                      </td>
                      <td>
                        {item.status === "open" ? (
                          <button
                            type="button"
                            onClick={() => deleteOpenEntry(item.appName, item.branch)}
                            className="ccc-delete-btn"
                            title="Delete this entry"
                          >
                            🗑 Delete
                          </button>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="ccc-pagination">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="ccc-pagination-btn"
                >
                  ← Previous
                </button>
                <span className="ccc-pagination-info">
                  Page {currentPage} of {totalPages} ({filtered.length} total items)
                </span>
                <button
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="ccc-pagination-btn"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </main>
  );
}
