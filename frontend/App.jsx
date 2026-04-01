import React, { useState, useEffect, useRef } from "react";
import AdminPanel from "./AdminPanel.jsx";
import CCCStatusDetails from "./CCCStatusDetails.jsx";
import { useLocation, useNavigate } from "react-router-dom";

const branchOptions = ["webos4media", "que4media"];

const emptyEntry = {
  branch: "webos4media",
  appName: "",
  tag: "",
  submissions: "",
  submissionTagDetails: "",
  issues: "",
  patchLink: "",
  status: "open",
  cccTicketLink: "",
  cccStartedDate: null,
};

const emptyMeta = {
  releaseNotes: "",
  testing: "",
};

const emptyBranchData = {
  webos4media: [],
  que4media: [],
};

const emptyBranchMeta = {
  webos4media: { ...emptyMeta },
  que4media: { ...emptyMeta },
};

function Login({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (username === "admin" && password === "admin") {
      sessionStorage.setItem("cccAdminLoggedIn", "true");
      onLogin();
    } else {
      setError("Invalid credentials");
    }
  };

  return (
    <main className="app-shell">
      <section className="hero-card">
        <div>
          <p className="eyebrow">CCC taxi Admin Login</p>
          <h1>Access Admin Panel</h1>
          <form onSubmit={handleSubmit} className="login-form">
            <label>
              <span>Username</span>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </label>
            <label>
              <span>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </label>
            {error && <p className="error">{error}</p>}
            <button type="submit" className="primary-button">Login</button>
          </form>
        </div>
      </section>
    </main>
  );
}

export default function App() {
  const [selectedBranch, setSelectedBranch] = useState("webos4media");
  const [entry, setEntry] = useState(emptyEntry);
  const [branchEntries, setBranchEntries] = useState(emptyBranchData);
  const [branchMeta, setBranchMeta] = useState(emptyBranchMeta);
  const [composerStatusFilter, setComposerStatusFilter] = useState("cccstarted");
  const [composerExpandedTicketGroups, setComposerExpandedTicketGroups] = useState({});
  const [composerCurrentPage, setComposerCurrentPage] = useState(1);
  const composerItemsPerPage = 10;
  const [isLoggedIn, setIsLoggedIn] = useState(
    () => sessionStorage.getItem("cccAdminLoggedIn") === "true"
  );
  const location = useLocation();
  const navigate = useNavigate();
  const isFirstLoad = useRef(true);

  // useEffect must be called before any conditional returns
  useEffect(() => {
    const loadLatestState = () => {
      fetch("http://localhost:5000/api/ccc")
        .then((res) => res.json())
        .then((data) => {
          if (data && data.length > 0) {
            const latest = data[data.length - 1];
            setBranchEntries(latest.branchEntries || emptyBranchData);
            // Only load meta on first initialization
            if (isFirstLoad.current) {
              isFirstLoad.current = false;
              const loadedMeta = latest.branchMeta || emptyBranchMeta;
              const ensuredMeta = {
                webos4media: { releaseNotes: "", testing: "", ...loadedMeta?.webos4media },
                que4media: { releaseNotes: "", testing: "", ...loadedMeta?.que4media },
              };
              setBranchMeta(ensuredMeta);
            }
          }
        })
        .catch((err) => console.error("Failed to load composer data:", err));
    };

    loadLatestState();
    const interval = setInterval(loadLatestState, 3000);
    return () => clearInterval(interval);
  }, []);

  // Now conditional returns are safe (after all hooks)
  if (location.pathname === "/admin" && !isLoggedIn) {
    return (
      <Login
        onLogin={() => {
          setIsLoggedIn(true);
          navigate("/admin");
        }}
      />
    );
  }

  if (location.pathname === "/admin" && isLoggedIn) {
    return (
      <AdminPanel
        branchOptions={branchOptions}
        onBack={() => navigate("/")}
        onLogout={() => {
          sessionStorage.removeItem("cccAdminLoggedIn");
          setIsLoggedIn(false);
          navigate("/admin");
        }}
      />
    );
  }

  if (location.pathname === "/ccc-status") {
    return (
      <CCCStatusDetails
        onBack={() => navigate("/")}
      />
    );
  }

  const formatIssuesForPreview = (issuesText) => {
    const tokens = issuesText
      .split(/[\s,\n]+/)
      .map((token) => token.trim())
      .filter(Boolean)
      .map((token) => token.replace(/^\[|\]$/g, ""));

    if (!tokens.length) {
      return "No issues recorded.";
    }

    return tokens.map((token) => `[${token}]`).join(" ");
  };

  const formatAppBundleTitle = (items) => {
    if (!items.length) {
      return "No app entries added yet.";
    }

    const appItems = items.map((item) => ({
      fullName: item.appName,
      shortName: item.appName.replace("com.webos.app.", ""),
      version: item.tag || "N/A",
      isWebOsApp: item.appName.startsWith("com.webos.app."),
    }));

    if (appItems.length === 1) {
      return `${appItems[0].fullName}=${appItems[0].version}`;
    }

    const allAreWebOsApps = appItems.every((item) => item.isWebOsApp);
    if (allAreWebOsApps) {
      const appEntries = appItems.map(
        (item) => `${item.shortName}=${item.version}`
      );
      return `com.webos.app.{${appEntries.join(",")}}`;
    }

    return appItems.map((item) => `${item.fullName}=${item.version}`).join(" ");
  };

  const addEntry = () => {
    if (!entry.appName.trim()) {
      return;
    }

    // Fetch latest data from backend to ensure all entries (including admin state changes) are preserved
    fetch("http://localhost:5000/api/ccc")
      .then((res) => res.json())
      .then((historyData) => {
        // Get the latest record's entries
        const latestRecord = historyData.length > 0 ? historyData[historyData.length - 1] : null;
        const latestEntries = latestRecord?.branchEntries?.[selectedBranch] || [];

        // Find existing open entry with same app name
        const existingOpenIndex = latestEntries.findIndex(
          (e) => e.appName === entry.appName && e.status === "open"
        );

        let updatedEntries;
        if (existingOpenIndex !== -1) {
          // Update existing open entry, preserve all other entries
          updatedEntries = [...latestEntries];
          updatedEntries[existingOpenIndex] = { ...entry, status: "open" };
        } else {
          // Add as new open entry, preserve all existing entries in other states
          updatedEntries = [...latestEntries, { ...entry, status: "open" }];
        }

        const newBranchEntries = {
          ...branchEntries,
          [selectedBranch]: updatedEntries,
        };

        setBranchEntries(newBranchEntries);

        // Save to backend
        fetch("http://localhost:5000/api/ccc", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ branchEntries: newBranchEntries, branchMeta }),
        })
          .then((res) => res.json())
          .then((data) => {
            if (data.ok) {
              console.log("Data saved successfully!");
              setEntry({ ...emptyEntry, branch: selectedBranch });
            }
          })
          .catch((err) => console.error("Failed to save data:", err));
      })
      .catch((err) => console.error("Failed to fetch latest data:", err));
  };

  const removeEntry = (branchName, indexToRemove) => {
    const newBranchEntries = {
      ...branchEntries,
      [branchName]: branchEntries[branchName].filter(
        (_, index) => index !== indexToRemove
      ),
    };

    setBranchEntries(newBranchEntries);

    // Save to backend
    fetch("http://localhost:5000/api/ccc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchEntries: newBranchEntries, branchMeta }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          console.log("Data saved successfully!");
        }
      })
      .catch((err) => console.error("Failed to save data:", err));
  };

  const onBranchChange = (branchName) => {
    setSelectedBranch(branchName);
    setEntry({ ...emptyEntry, branch: branchName });
  };

  const onMetaChange = (field, value) => {
    const updatedMeta = {
      ...branchMeta,
      [selectedBranch]: {
        ...branchMeta[selectedBranch],
        [field]: value,
      },
    };
    setBranchMeta(updatedMeta);

    // Save immediately to backend
    fetch("http://localhost:5000/api/ccc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branchEntries, branchMeta: updatedMeta }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.ok) {
          console.log("Meta saved successfully!");
        }
      })
      .catch((err) => console.error("Failed to save meta:", err));
  };

  const loadSubmissionsFromWall = (appName, tag) => {
    if (!appName || !tag) return;
    fetch("http://localhost:5000/api/wall-fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appName, tag }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data.error) {
          console.error("Wall API error:", data.error);
          return;
        }
        // Assuming data has submissions and submissionTagDetails fields
        if (data.submissions) {
          setEntry((prev) => ({ ...prev, submissions: data.submissions, submissionTagDetails: data.submissionTagDetails || prev.submissionTagDetails }));
        }
      })
      .catch((err) => console.error("Failed to fetch from wall:", err));
  };

  const selectedBranchEntries = branchEntries[selectedBranch];
  const selectedMeta = branchMeta[selectedBranch] || { releaseNotes: "", testing: "" };

  const openItems = selectedBranchEntries.filter((item) => item.status === "open");
  const inProgressItems = selectedBranchEntries.filter((item) => item.status === "inprogress");
  const cccStartedItems = selectedBranchEntries.filter((item) => item.status === "cccstarted");
  const closedItems = selectedBranchEntries.filter((item) => item.status === "closed");

  const cccStartedGroups = Object.entries(branchEntries).reduce((acc, [branch, items]) => {
    items
      .filter((item) => item.status === "cccstarted")
      .forEach((item) => {
        const key = `${item.cccTicketLink || "No ticket"} (${branch})`;
        if (!acc[key]) acc[key] = [];
        acc[key].push({ ...item, branch });
      });
    return acc;
  }, {});

  const closedGroups = Object.entries(branchEntries).reduce((acc, [branch, items]) => {
    items
      .filter((item) => item.status === "closed")
      .forEach((item) => {
        const key = `${item.cccTicketLink || "No ticket"} (${branch})`;
        if (!acc[key]) acc[key] = [];
        acc[key].push({ ...item, branch });
      });
    return acc;
  }, {});

  const appBundleTitle = formatAppBundleTitle(openItems);
  const issueLines = openItems
    .flatMap((item) =>
      formatIssuesForPreview(item.issues || "")
        .split(" ")
        .filter((token) => token.startsWith("[") && token.endsWith("]"))
    );

  const previewText = [
    appBundleTitle,
    "",
    ":Release Notes:",
    selectedMeta.releaseNotes || "No release notes added.",
    "",
    ":Detailed Notes:",
    openItems.length
      ? openItems
          .map(
            (item) =>
              `${item.appName}=${item.tag || "N/A"}\n${item.submissionTagDetails || "No submission tag details added."}`
          )
          .join("\n\n")
      : "No app entries added yet.",
    "",
    ":Testing Performed:",
    selectedMeta.testing || "No testing notes added.",
    "",
    ":Issues Addressed:",
    issueLines.length ? issueLines.join("\n") : "No issues recorded.",
  ].join("\n");

  return (
    <main className="app-shell">
      {/* Top Navigation */}
      <header className="app-topbar" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px', borderBottom: '1px solid #e0e0e0', marginBottom: '20px' }}>
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>CCC taxi Release Composer</p>
          <h1 style={{ margin: '4px 0 0 0', fontSize: '24px' }}>Combined Release Form</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            onClick={() => navigate("/ccc-status")}
            className="primary-button"
          >
            Status Overview
          </button>
          <button 
            type="button" 
            onClick={() => navigate("/admin")}
            className="primary-button"
          >
            Admin Panel
          </button>
        </div>
      </header>

      <section className="workspace-grid">
        <div className="panel stack-gap">
          <div className="panel-header">
            <div>
              <h2>Combined release form</h2>
              <p>Add app details plus release metadata in one place per branch.</p>
            </div>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>Branch</span>
              <select
                value={selectedBranch}
                onChange={(event) => onBranchChange(event.target.value)}
                required
              >
                {branchOptions.map((branchName) => (
                  <option key={branchName} value={branchName}>
                    {branchName}
                  </option>
                ))}
              </select>
            </label>

            <label className="field">
              <span>App Name</span>
              <input
                placeholder="com.webos.app.magicnum"
                value={entry.appName}
                onChange={(event) =>
                  setEntry({ ...entry, appName: event.target.value })
                }
                required
              />
            </label>

            <label className="field">
              <span>Tag</span>
              <input
                placeholder="230"
                value={entry.tag}
                onChange={(event) =>
                  setEntry({ ...entry, tag: event.target.value })
                }
                onBlur={(event) => loadSubmissionsFromWall(entry.appName, event.target.value)}
                required
              />
            </label>

            <label className="field field-full">
              <span>Submissions</span>
              <textarea
                rows="3"
                placeholder="578442bf0a6b12ff85c887d2590444cbc8276fed"
                value={entry.submissions}
                onChange={(event) =>
                  setEntry({ ...entry, submissions: event.target.value })
                }
                required
              />
            </label>

            <label className="field field-full">
              <span>Submission Tag Details</span>
              <textarea
                rows="4"
                placeholder="submissions/256..submissions/257&#10;e2a5227 [Dev] responsive"
                value={entry.submissionTagDetails}
                onChange={(event) =>
                  setEntry({ ...entry, submissionTagDetails: event.target.value })
                }
                required
              />
            </label>

            <label className="field">
              <span>Release Notes</span>
              <textarea
                rows="4"
                placeholder="Bluetooth sound icon appears small"
                value={selectedMeta.releaseNotes}
                onChange={(event) => onMetaChange("releaseNotes", event.target.value)}
              />
            </label>

            <label className="field">
              <span>Testing Performed</span>
              <textarea
                rows="4"
                placeholder="featureBAT,minibat done"
                value={selectedMeta.testing}
                onChange={(event) => onMetaChange("testing", event.target.value)}
              />
            </label>

            <label className="field field-full">
              <span>Issues Addressed (comma separated)</span>
              <textarea
                rows="3"
                placeholder="TVPLAT-836133, TVPLAT-840206, TVPLAT-861206"
                value={entry.issues}
                onChange={(event) =>
                  setEntry({ ...entry, issues: event.target.value })
                }
                required
              />
            </label>

            <label className="field">
              <span>Patch Link</span>
              <input
                placeholder="https://github.com/example/repo/pull/123"
                value={entry.patchLink}
                onChange={(event) =>
                  setEntry({ ...entry, patchLink: event.target.value })
                }
                required
              />
            </label>

          </div>

          <button className="primary-button" type="button" onClick={addEntry}>
            ADD CCC
          </button>
        </div>

        <div className="panel stack-gap">
          <div className="preview-card">
            <div className="preview-header">
              <div>
                <p className="eyebrow">Live output</p>
                <h2>CCC Preview ({selectedBranch})</h2>
              </div>
            </div>
            <pre>{previewText}</pre>
          </div>

        </div>

      </section>
    </main>
  );
}