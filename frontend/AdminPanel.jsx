import React, { useState, useEffect } from "react";

function extractTicketNumber(url) {
  if (!url) return "";
  const match = url.match(/\/([A-Z][A-Z0-9]+-\d+)\s*$/i) || url.match(/([A-Z][A-Z0-9]+-\d+)\s*$/i);
  return match ? match[1] : url;
}

const branchColors = {
  webos4media: { badge: "#254336", text: "#eff8f1" },
  que4media: { badge: "#3b2454", text: "#f0ecf8" },
};

function formatIssues(issuesText) {
  const tokens = (issuesText || "")
    .split(/[\s,\n]+/)
    .map((t) => t.trim())
    .filter(Boolean)
    .map((t) => t.replace(/^\[|\]$/g, ""));
  return tokens.length ? tokens.map((t) => `[${t}]`).join("  ") : "—";
}

function formatBundleTitle(items) {
  if (!items.length) return "—";
  const appItems = items.map((item) => ({
    fullName: item.appName,
    shortName: item.appName.replace("com.webos.app.", ""),
    version: item.tag || "N/A",
    isWebOs: item.appName.startsWith("com.webos.app."),
  }));
  if (appItems.length === 1) return `${appItems[0].fullName}=${appItems[0].version}`;
  const allWebOs = appItems.every((i) => i.isWebOs);
  if (allWebOs)
    return `com.webos.app.{${appItems.map((i) => `${i.shortName}=${i.version}`).join(",")}}`;
  return appItems.map((i) => `${i.fullName}=${i.version}`).join(" ");
}

export default function AdminPanel({ branchOptions, onBack, onLogout }) {
  const [activeTab, setActiveTab] = useState(branchOptions[0]);
  const [branchEntries, setBranchEntries] = useState({ webos4media: [], que4media: [] });
  const [branchMeta, setBranchMeta] = useState({ 
    webos4media: { releaseNotes: "", testing: "" },
    que4media: { releaseNotes: "", testing: "" },
  });
  const [history, setHistory] = useState([]);
  const [selectedRecordId, setSelectedRecordId] = useState(null);
  const [activeStatus, setActiveStatus] = useState("open");
  const [cccTicketInput, setCccTicketInput] = useState("");
  const [cccTicketFilter, setCccTicketFilter] = useState("");
  const [expandedTicketGroups, setExpandedTicketGroups] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const applyRecord = (record) => {
    if (!record) return;
    setBranchEntries(record.branchEntries || {});
    setBranchMeta(record.branchMeta || {});
    setSelectedRecordId(record._id);
  };

  const loadHistory = () => {
    fetch("http://localhost:5001/api/ccc")
      .then((res) => res.json())
      .then((data) => {
        setHistory(data);
        if (data.length > 0) {
          const latest = data[data.length - 1];
          if (!selectedRecordId || !data.find((item) => item._id === selectedRecordId)) {
            applyRecord(latest);
          }
        }
      })
      .catch((err) => console.error("Failed to load data:", err));
  };

  useEffect(() => {
    loadHistory();
    const interval = setInterval(loadHistory, 3000);
    return () => clearInterval(interval);
  }, [selectedRecordId]);

  useEffect(() => {
    setCccTicketFilter("");
    setExpandedTicketGroups({});
    setCurrentPage(1);
  }, [activeStatus]);

  const items = branchEntries[activeTab] || [];
  const meta = branchMeta[activeTab] || {};
  const colors = branchColors[activeTab] || { badge: "#254336", text: "#eff8f1" };

  const openItems = items.filter((item) => item.status === "open");
  const inProgressItems = items.filter((item) => item.status === "inprogress");
  const cccStartedItems = items.filter((item) => item.status === "cccstarted");
  const closedItems = items.filter((item) => item.status === "closed");

  const selectedItems =
    activeStatus === "inprogress"
      ? inProgressItems
      : activeStatus === "cccstarted"
      ? cccStartedItems
      : activeStatus === "closed"
      ? closedItems
      : openItems;

  const bundleTitle = formatBundleTitle(selectedItems);

  const cccStartedTicketGroups = cccStartedItems.reduce((acc, item) => {
    const ticket = item.cccTicketLink || 'No ticket';
    if (!acc[ticket]) acc[ticket] = [];
    acc[ticket].push(item);
    return acc;
  }, {});

  const closedTicketGroups = closedItems.reduce((acc, item) => {
    const ticket = item.cccTicketLink || 'No ticket';
    if (!acc[ticket]) acc[ticket] = [];
    acc[ticket].push(item);
    return acc;
  }, {});

  const ticketGroups = (activeStatus === 'cccstarted' || activeStatus === 'closed')
    ? selectedItems.reduce((acc, item) => {
        const ticket = item.cccTicketLink || 'No ticket';
        if (!acc[ticket]) acc[ticket] = [];
        acc[ticket].push(item);
        return acc;
      }, {})
    : {};

  const totalApps = branchOptions.reduce(
    (sum, b) => sum + (branchEntries[b]?.length || 0),
    0
  );

  const formatPreviewForItems = (items) => {
    // Auto-generate release notes from app names
    const releaseNotes = items.map(item => item.appName).join(" and ");

    return [
      formatBundleTitle(items),
      "",
      ":Release Notes:",
      releaseNotes || "No applications added.",
      "",
      ":Detailed Notes:",
      items
        .map(
          (item) =>
            `${item.appName}=${item.tag || "N/A"}\n${item.submissions || "No submissions listed."}\n${item.submissionTagDetails || "No submission tag details added."}`
        )
        .join("\n\n"),
      "",
      ":Testing Performed:",
      "featureBAT, miniBAT: OK",
      "",
      ":Issues Addressed:",
      items
        .flatMap((item) =>
          formatIssues(item.issues || "")
            .split("  ")
            .filter((t) => t.startsWith("[") && t.endsWith("]"))
        )
        .join("\n") || "No issues recorded.",
    ].join("\n");
  };

  const filteredTicketKeys = Object.keys(ticketGroups)
    .filter((ticket) =>
      ticket.toLowerCase().includes(cccTicketFilter.trim().toLowerCase())
    );

  const toggleTicketGroup = (ticket) => {
    setExpandedTicketGroups((prev) => ({
      ...prev,
      [ticket]: !prev[ticket],
    }));
  };

  const saveToBackend = (updatedBranchEntries) => {
    fetch("http://localhost:5001/api/ccc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchEntries: updatedBranchEntries, branchMeta }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          loadHistory();
        }
      })
      .catch((err) => console.error("Failed to save status:", err));
  };

  const updateEntryStatus = (appName, newStatus, ticketLink = "") => {
    const updated = {
      ...branchEntries,
      [activeTab]: (branchEntries[activeTab] || []).map((item) => {
        if (item.appName === appName && activeStatus === item.status) {
          const patched = { ...item, status: newStatus };
          if (newStatus === "cccstarted") {
            patched.cccTicketLink = ticketLink;
            patched.cccStartedDate = new Date().toISOString();
          }
          if (newStatus === "closed") {
            patched.closedDate = new Date().toISOString();
          }
          return patched;
        }
        return item;
      }),
    };
    setBranchEntries(updated);
    saveToBackend(updated);
  };

  const bulkUpdateToCccStarted = (ticketLink) => {
    if (!ticketLink.trim()) {
      alert("Please enter a CCC ticket link");
      return;
    }
    const updated = {
      ...branchEntries,
      [activeTab]: (branchEntries[activeTab] || []).map((item) => {
        if (item.status === "inprogress") {
          return {
            ...item,
            status: "cccstarted",
            cccTicketLink: ticketLink,
            cccStartedDate: new Date().toISOString(),
          };
        }
        return item;
      }),
    };
    setBranchEntries(updated);
    saveToBackend(updated);
    setCccTicketInput("");
  };

  const bulkUpdateToClosed = () => {
    const updated = {
      ...branchEntries,
      [activeTab]: (branchEntries[activeTab] || []).map((item) => {
        if (item.status === "cccstarted") {
          return {
            ...item,
            status: "closed",
            closedDate: new Date().toISOString(),
          };
        }
        return item;
      }),
    };
    setBranchEntries(updated);
    saveToBackend(updated);
  };

  const closeTicketGroup = (ticket) => {
    const updated = {
      ...branchEntries,
      [activeTab]: (branchEntries[activeTab] || []).map((item) => {
        if (item.status === "cccstarted" && (item.cccTicketLink || 'No ticket') === ticket) {
          return {
            ...item,
            status: "closed",
            closedDate: new Date().toISOString(),
          };
        }
        return item;
      }),
    };
    setBranchEntries(updated);
    saveToBackend(updated);
    setExpandedTicketGroups((prev) => ({ ...prev, [ticket]: false }));
  };

  const reloadHistory = () => {
    fetch("http://localhost:5001/api/ccc")
      .then((res) => res.json())
      .then((data) => {
        setHistory(data);
        if (data.length > 0) {
          const nxt = data.find((r) => r._id === selectedRecordId) || data[data.length - 1];
          applyRecord(nxt);
        } else {
          setBranchEntries({});
          setBranchMeta({});
          setSelectedRecordId(null);
        }
      })
      .catch((err) => console.error("Failed to load data:", err));
  };

  const deleteRecord = (recordId) => {
    if (!recordId) return;
    fetch(`http://localhost:5001/api/ccc/${recordId}`, { method: "DELETE" })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          setHistory(data.remaining);
          if (data.remaining.length > 0) {
            const latest = data.remaining[data.remaining.length - 1];
            applyRecord(latest);
          } else {
            setBranchEntries({});
            setBranchMeta({});
            setSelectedRecordId(null);
          }
        }
      })
      .catch((err) => console.error("Delete failed:", err));
  };

  return (
    <main className="ap-shell">
      {/* Top bar */}
      <header className="ap-topbar">
        <div className="ap-brand">
          <p className="eyebrow" style={{ margin: 0 }}>CCC taxi : MS System App Solution</p>
          <h1 className="ap-title">Admin Panel</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button className="primary-button" type="button" onClick={onLogout}>
            Logout
          </button>
          <button className="primary-button" type="button" onClick={onBack}>
            ← Back to Composer
          </button>
        </div>
      </header>

      {/* Summary stats */}
      <section className="ap-stats">
        <article className="ap-stat">
          <span>Total Branches</span>
          <strong>{branchOptions.length}</strong>
        </article>
        <article className="ap-stat">
          <span>Total Apps Entered</span>
          <strong>{totalApps}</strong>
        </article>
        {branchOptions.map((b) => (
          <article className="ap-stat" key={b}>
            <span>{b}</span>
            <strong>{branchEntries[b]?.length || 0} app(s)</strong>
          </article>
        ))}
      </section>

      {/* Branch tabs */}
      <div className="ap-tabs">
        {branchOptions.map((b) => (
          <button
            key={b}
            type="button"
            className={`ap-tab${activeTab === b ? " ap-tab--active" : ""}`}
            onClick={() => setActiveTab(b)}
          >
            {b}
            <span className="ap-tab-count">{branchEntries[b]?.length || 0}</span>
          </button>
        ))}
      </div>

      {/* Branch detail card */}
      <section className="ap-branch-section">
        {/* Bundle title row */}
        <div className="ap-bundle-row">
          <div
            className="ap-branch-badge"
            style={{ background: colors.badge, color: colors.text }}
          >
            {activeTab}
          </div>
          <code className="ap-bundle-title">{bundleTitle}</code>
        </div>

        {/* Meta row - REMOVED: Release Notes and Testing Performed fields */}

        {/* Status tabs */}
        <div className="ap-status-tabs">
          {['open', 'inprogress', 'cccstarted', 'closed'].map((status) => {
            const statusCounts = {
              open: openItems.length,
              inprogress: inProgressItems.length,
              cccstarted: Object.keys(cccStartedTicketGroups).length,
              closed: Object.keys(closedTicketGroups).length,
            };
            return (
              <button
                key={status}
                type="button"
                onClick={() => setActiveStatus(status)}
                className={activeStatus === status ? 'ap-tab ap-tab--active' : 'ap-tab'}
              >
                {status.replace('cccstarted', 'CCC Started').toUpperCase()}
                <span className="ap-tab-count">{statusCounts[status]}</span>
              </button>
            );
          })}
        </div>

        {/* Bulk action controls */}
        {activeStatus === 'inprogress' && inProgressItems.length > 0 && (
          <div className="ap-bulk-actions">
            <div className="ap-bulk-actions-row">
              <input
                type="text"
                placeholder={`Enter CCC Ticket Link/Number (${activeTab})`}
                value={cccTicketInput}
                onChange={(e) => setCccTicketInput(e.target.value)}
                className="ap-bulk-input"
              />
              <button
                type="button"
                onClick={() => bulkUpdateToCccStarted(cccTicketInput)}
                className="primary-button"
              >
                CCC Started (All {inProgressItems.length})
              </button>
            </div>
          </div>
        )}

        {activeStatus === 'cccstarted' && cccStartedItems.length > 0 && (
          <div className="ap-bulk-actions">
            <button
              type="button"
              onClick={bulkUpdateToClosed}
              className="primary-button"
            >
              Close All ({Object.keys(cccStartedTicketGroups).length} ticket group(s))
            </button>
          </div>
        )}

        {/* App entries table / accordion for cccstarted/closed */}
        {activeStatus === 'cccstarted' || activeStatus === 'closed' ? (
          <div className="ap-ticket-accordion">
            <div className="ap-ticket-filter">
              <input
                type="text"
                placeholder="Filter by CCC Ticket Link"
                value={cccTicketFilter}
                onChange={(e) => setCccTicketFilter(e.target.value)}
              />
            </div>

            {selectedItems.length === 0 ? (
              <div className="ap-empty">
                <p>No {activeStatus === 'cccstarted' ? 'CCC started' : 'closed'} items yet.</p>
              </div>
            ) : filteredTicketKeys.length === 0 ? (
              <div className="ap-empty">
                <p>No groups match the ticket filter.</p>
              </div>
            ) : (
              filteredTicketKeys.map((ticket, groupIndex) => {
                const group = ticketGroups[ticket] || [];
                const open = !!expandedTicketGroups[ticket];
                return (
                  <div key={`group-${groupIndex}`} className="ap-accordion-group">
                    <div
                      className="ap-accordion-header"
                      onClick={() => toggleTicketGroup(ticket)}
                    >
                      <div>
                        <strong>
                          {ticket !== 'No ticket' ? (
                            <a href={ticket} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                              {extractTicketNumber(ticket)}
                            </a>
                          ) : ticket}
                        </strong>
                        <span style={{ marginLeft: '10px', fontWeight: 400 }}>({group.length} item(s))</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {activeStatus === 'cccstarted' && (
                          <button
                            type="button"
                            className="ap-accordion-close"
                            onClick={(e) => {
                              e.stopPropagation();
                              closeTicketGroup(ticket);
                            }}
                          >
                            Close
                          </button>
                        )}
                        <span>{open ? '▾' : '▸'}</span>
                      </div>
                    </div>
                    {open && (
                      <div className="ap-accordion-body">
                        <table className="ap-table">
                          <thead>
                            <tr>
                              <th>#</th>
                              <th>App Name</th>
                              <th>Tag</th>
                              <th>Submissions</th>
                              <th>Tag Details</th>
                              <th>Issues</th>
                              <th>Patch Link</th>
                            </tr>
                          </thead>
                          <tbody>
                            {group.map((item, index) => (
                              <tr key={`${ticket}-${item.appName}-${index}`}>
                                <td className="ap-cell-num">{index + 1}</td>
                                <td><code className="ap-code">{item.appName}</code></td>
                                <td><span className="ap-version-chip">{item.tag || 'N/A'}</span></td>
                                <td className="ap-cell-mono">{item.submissions || '—'}</td>
                                <td className="ap-cell-wrap">{item.submissionTagDetails || '—'}</td>
                                <td className="ap-cell-issues">{formatIssues(item.issues)}</td>
                                <td className="ap-cell-link">{item.patchLink ? <a href={item.patchLink} target="_blank" rel="noopener noreferrer">Link</a> : '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        {activeStatus === 'cccstarted' && (
                          <div style={{ marginTop: '14px' }}>
                            <p className="ap-meta-label">CCC Preview for this ticket</p>
                            <pre className="ap-preview-dark" style={{ maxHeight: '220px', overflow: 'auto' }}>
                              {formatPreviewForItems(group)}
                            </pre>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        ) : selectedItems.length ? (
          <>
            <div className="ap-table-wrap">
              <table className="ap-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>App Name</th>
                    <th>Tag</th>
                    <th>Submissions</th>
                    <th>Tag Details</th>
                    <th>Issues</th>
                    <th>Patch Link</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {(() => {
                    const totalPages = Math.ceil(selectedItems.length / itemsPerPage);
                    const startIndex = (currentPage - 1) * itemsPerPage;
                    const paginatedItems = selectedItems.slice(startIndex, startIndex + itemsPerPage);
                    
                    return paginatedItems.map((item, index) => (
                      <tr key={`${item.appName}-${startIndex + index}`}>
                        <td className="ap-cell-num">{startIndex + index + 1}</td>
                        <td><code className="ap-code">{item.appName}</code></td>
                        <td><span className="ap-version-chip">{item.tag || 'N/A'}</span></td>
                        <td className="ap-cell-mono">{item.submissions || '—'}</td>
                        <td className="ap-cell-wrap">{item.submissionTagDetails || '—'}</td>
                        <td className="ap-cell-issues">{formatIssues(item.issues)}</td>
                        <td className="ap-cell-link">{item.patchLink ? <a href={item.patchLink} target="_blank" rel="noopener noreferrer">Link</a> : '—'}</td>
                        <td>
                          {activeStatus === 'open' ? (
                            <button
                              type="button"
                              onClick={() => updateEntryStatus(item.appName, 'inprogress')}
                              className="ap-action-button"
                            >
                              To In Progress
                            </button>
                          ) : activeStatus === 'inprogress' ? (
                            <button
                              type="button"
                              onClick={() => updateEntryStatus(item.appName, 'open')}
                              className="ap-action-button"
                            >
                              ↶ Back to Open
                            </button>
                          ) : activeStatus === 'cccstarted' ? (
                            <span className="ap-status-indicator ap-status-ticket">
                              Ticket: {item.cccTicketLink ? (
                                <a href={item.cccTicketLink} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'underline' }}>
                                  {extractTicketNumber(item.cccTicketLink)}
                                </a>
                              ) : '—'}
                            </span>
                          ) : (
                            <span className="ap-status-indicator ap-status-closed">
                              Closed: {new Date(item.closedDate).toLocaleDateString()}
                            </span>
                          )}
                        </td>
                      </tr>
                    ));
                  })()}
                </tbody>
              </table>
            </div>
            {selectedItems.length > itemsPerPage && (
              <div className="ap-pagination">
                <button
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="ap-pagination-btn"
                >
                  ← Previous
                </button>
                <span className="ap-pagination-info">
                  Page {currentPage} of {Math.ceil(selectedItems.length / itemsPerPage)} ({selectedItems.length} total items)
                </span>
                <button
                  disabled={currentPage === Math.ceil(selectedItems.length / itemsPerPage)}
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="ap-pagination-btn"
                >
                  Next →
                </button>
              </div>
            )}
          </>
        ) : (
          <div className="ap-empty">
            <p>No app entries added for <strong>{activeTab}</strong> yet.</p>
            <span>Switch to the Composer and add entries for this branch.</span>
          </div>
        )}

      </section>
    </main>
  );
}
