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
    <main className="app-shell" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
      <div style={{
        textAlign: 'center',
        maxWidth: '420px',
        width: '100%',
        padding: '40px 36px',
        background: 'rgba(255,251,245,0.92)',
        backdropFilter: 'blur(16px)',
        borderRadius: '24px',
        border: '1px solid rgba(125,78,36,0.12)',
        boxShadow: '0 24px 64px rgba(65,39,22,0.14)',
      }}>
        <div style={{ marginBottom: '8px', fontSize: '40px' }}>&#128272;</div>
        <p className="eyebrow" style={{ marginBottom: '6px' }}>CCC taxi</p>
        <h1 style={{ margin: '0 0 6px', fontSize: '1.8rem', fontFamily: 'Georgia, serif' }}>Admin Login</h1>
        <p style={{ margin: '0 0 28px', color: 'var(--muted)', fontSize: '0.92rem' }}>Sign in to manage releases</p>
        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '18px', textAlign: 'left' }}>
          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)', letterSpacing: '0.02em' }}>Username</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              placeholder="Enter username"
              style={{ padding: '12px 16px', border: '1px solid rgba(125,78,36,0.16)', borderRadius: '12px', background: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
            />
          </label>
          <label style={{ display: 'grid', gap: '6px' }}>
            <span style={{ fontWeight: 700, fontSize: '0.85rem', color: 'var(--text)', letterSpacing: '0.02em' }}>Password</span>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter password"
              style={{ padding: '12px 16px', border: '1px solid rgba(125,78,36,0.16)', borderRadius: '12px', background: 'rgba(255,255,255,0.8)', fontSize: '0.95rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s' }}
            />
          </label>
          {error && <p style={{ color: '#c62828', fontWeight: 600, margin: 0, fontSize: '0.88rem', textAlign: 'center' }}>{error}</p>}
          <button type="submit" className="primary-button" style={{ width: '100%', padding: '13px', fontSize: '1rem', fontWeight: 700, borderRadius: '12px', marginTop: '4px' }}>Sign In</button>
        </form>
      </div>
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
  const [appSuggestions, setAppSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestionIndex, setActiveSuggestionIndex] = useState(-1);
  const [wallUsername, setWallUsername] = useState(() => sessionStorage.getItem("wallUsername") || "");
  const [wallPassword, setWallPassword] = useState(() => sessionStorage.getItem("wallPassword") || "");
  const [wallLoggedIn, setWallLoggedIn] = useState(() => sessionStorage.getItem("wallLoggedIn") === "true");
  const [wallLoginError, setWallLoginError] = useState("");
  const [wallLoggingIn, setWallLoggingIn] = useState(false);
  const [wallApiResponse, setWallApiResponse] = useState(null);
  const [wallFetchLoading, setWallFetchLoading] = useState(false);
  const [wallFetchError, setWallFetchError] = useState("");
  const [formError, setFormError] = useState("");
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
      setFormError("App Name is required.");
      return;
    }
    if (!entry.submissions.trim()) {
      setWallFetchError("Submissions field is mandatory. Please enter a valid tag to auto-fill.");
      return;
    }
    if (!entry.submissionTagDetails.trim()) {
      setFormError("Submission Tag Details is required.");
      return;
    }
    if (!entry.issues.trim()) {
      setFormError("Issues Addressed is required.");
      return;
    }
    if (!entry.patchLink.trim()) {
      setFormError("Patch Link is required.");
      return;
    }
    setFormError("");

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

  const handleAppNameChange = (value) => {
    setEntry({ ...entry, appName: value });
    setActiveSuggestionIndex(-1);
    setFormError("");

    if (!value.trim()) {
      setAppSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    // Fetch suggestions from backend
    fetch(`http://localhost:5000/api/applications/search?q=${encodeURIComponent(value)}`)
      .then((res) => res.json())
      .then((data) => {
        setAppSuggestions(data || []);
        setShowSuggestions(true);
      })
      .catch((err) => console.error("Search error:", err));
  };

  const handleSuggestionSelect = (appName) => {
    setEntry({ ...entry, appName });
    setShowSuggestions(false);
    setAppSuggestions([]);
    setActiveSuggestionIndex(-1);
  };

  const handleAppNameKeyDown = (event) => {
    if (!appSuggestions.length) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveSuggestionIndex((prev) => Math.min(prev + 1, appSuggestions.length - 1));
      return;
    }

    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveSuggestionIndex((prev) => Math.max(prev - 1, 0));
      return;
    }

    if (event.key === "Enter") {
      event.preventDefault();
      if (activeSuggestionIndex >= 0 && activeSuggestionIndex < appSuggestions.length) {
        handleSuggestionSelect(appSuggestions[activeSuggestionIndex]);
      }
    }

    if (event.key === "Escape") {
      setShowSuggestions(false);
      setActiveSuggestionIndex(-1);
    }
  };

  const handleWallLogin = () => {
    if (!wallUsername || !wallPassword) {
      setWallLoginError("Username and password are required");
      return;
    }
    setWallLoggingIn(true);
    setWallLoginError("");
    fetch("http://localhost:5000/api/wall-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: wallUsername, password: wallPassword }),
    })
      .then((res) => {
        if (!res.ok) return res.json().then((d) => { throw new Error(d?.error || "Login failed"); });
        return res.json();
      })
      .then((data) => {
        setWallLoggedIn(true);
        sessionStorage.setItem("wallUsername", wallUsername);
        sessionStorage.setItem("wallPassword", wallPassword);
        sessionStorage.setItem("wallLoggedIn", "true");
        console.log("Wall login successful:", data.account?.name || wallUsername);
      })
      .catch((err) => {
        setWallLoginError(err.message);
        setWallLoggedIn(false);
        sessionStorage.removeItem("wallLoggedIn");
      })
      .finally(() => setWallLoggingIn(false));
  };

  const handleWallLogout = () => {
    setWallLoggedIn(false);
    setWallUsername("");
    setWallPassword("");
    sessionStorage.removeItem("wallUsername");
    sessionStorage.removeItem("wallPassword");
    sessionStorage.removeItem("wallLoggedIn");
  };

  const loadSubmissionsFromWall = (appName, tag, { shouldShowAlert = true } = {}) => {
    if (!appName || !tag) return;
    if (!wallLoggedIn || !wallUsername || !wallPassword) {
      setWallFetchError("Please login to Wall first.");
      return;
    }

    setWallFetchLoading(true);
    setWallFetchError("");
    setWallApiResponse(null);

    fetch("http://localhost:5000/api/wall-fetch", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ appName, tag, username: wallUsername, password: wallPassword }),
    })
      .then((res) => {
        if (!res.ok) {
          return res.json().then((d) => {
            if (d?.needsLogin) {
              setWallLoggedIn(false);
              sessionStorage.removeItem("wallLoggedIn");
            }
            throw new Error(d?.error || `Wall fetch failed with status ${res.status}`);
          });
        }
        return res.json();
      })
      .then((data) => {
        if (!data) return;
        console.log("Wall API response:", data);

        // Store the full raw response for display
        setWallApiResponse(data.raw || data);

        const revisionValue = data.revision || data.resource || data.submissions || "";

        if (!revisionValue) {
          setWallFetchError("No tag found — the tag does not exist for this app.");
          setEntry((prev) => ({ ...prev, submissions: "" }));
          return;
        }

        setEntry((prev) => ({
          ...prev,
          submissions: revisionValue,
        }));
      })
      .catch((err) => {
        console.error("Failed to fetch from wall:", err);
        setWallFetchError(err.message);
      })
      .finally(() => setWallFetchLoading(false));
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
      <header style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '16px 24px',
        marginBottom: '24px',
        background: 'var(--panel)',
        border: '1px solid var(--line)',
        borderRadius: '20px',
        backdropFilter: 'blur(12px)',
        boxShadow: '0 4px 20px rgba(65,39,22,0.08)',
      }}>
        <div>
          <p className="eyebrow" style={{ margin: 0 }}>CCC taxi : MS System App Solution</p>
          <h1 style={{ margin: '4px 0 0 0', fontSize: '1.4rem', fontFamily: 'Georgia, serif', color: 'var(--text)' }}>Combined Release Form</h1>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button 
            type="button" 
            onClick={() => navigate("/ccc-status")}
            className="ghost-button"
            style={{ fontSize: '0.88rem', fontWeight: 700, padding: '10px 18px' }}
          >
            Status Overview
          </button>
          <button 
            type="button" 
            onClick={() => navigate("/admin")}
            className="primary-button"
            style={{ fontSize: '0.88rem', fontWeight: 700, padding: '10px 18px' }}
          >
            Admin Panel
          </button>
        </div>
      </header>

      <section className="workspace-grid">
        <div className="panel stack-gap">
          {/* Wall Login Section */}
          <div style={{
            padding: '18px 22px',
            background: wallLoggedIn ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' : 'linear-gradient(135deg, rgba(255,250,244,0.9) 0%, rgba(246,240,232,0.9) 100%)',
            borderRadius: '18px',
            border: `1px solid ${wallLoggedIn ? '#a5d6a7' : 'var(--line)'}`,
            boxShadow: wallLoggedIn ? '0 4px 16px rgba(76,175,80,0.1)' : '0 2px 10px rgba(0,0,0,0.04)',
            transition: 'all 0.3s ease',
          }}>
            {wallLoggedIn ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#4caf50', display: 'inline-block', boxShadow: '0 0 6px rgba(76,175,80,0.5)' }} />
                  <span style={{ color: '#2e7d32', fontWeight: 600, fontSize: '14px' }}>Connected as <strong>{wallUsername}</strong></span>
                </div>
                <button type="button" onClick={handleWallLogout} style={{ padding: '6px 16px', fontSize: '0.82rem', cursor: 'pointer', borderRadius: '999px', border: '1px solid #c8e6c9', background: 'rgba(255,255,255,0.9)', color: '#666', fontWeight: 600, transition: 'all 0.2s' }}>Disconnect</button>
              </div>
            ) : (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
                  <span style={{ fontSize: '18px' }}>&#128274;</span>
                  <span style={{ fontWeight: 700, fontSize: '15px', color: '#333' }}>Wall / Gerrit Login</span>
                </div>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
                  <label style={{ flex: 1, minWidth: '150px' }}>
                    <small style={{ fontWeight: 600, color: '#555', fontSize: '12px', display: 'block', marginBottom: '4px' }}>Username</small>
                    <input
                      type="text"
                      value={wallUsername}
                      onChange={(e) => setWallUsername(e.target.value)}
                      placeholder="your.username"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(125,78,36,0.16)', fontSize: '0.92rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', background: 'rgba(255,255,255,0.8)' }}
                    />
                  </label>
                  <label style={{ flex: 1, minWidth: '150px' }}>
                    <small style={{ fontWeight: 600, color: '#555', fontSize: '12px', display: 'block', marginBottom: '4px' }}>HTTP Password</small>
                    <input
                      type="password"
                      value={wallPassword}
                      onChange={(e) => setWallPassword(e.target.value)}
                      placeholder="Enter HTTP password"
                      style={{ width: '100%', boxSizing: 'border-box', padding: '10px 14px', borderRadius: '12px', border: '1px solid rgba(125,78,36,0.16)', fontSize: '0.92rem', outline: 'none', transition: 'border-color 0.2s, box-shadow 0.2s', background: 'rgba(255,255,255,0.8)' }}
                    />
                  </label>
                  <button type="button" onClick={handleWallLogin} disabled={wallLoggingIn} className="primary-button" style={{ padding: '10px 24px', whiteSpace: 'nowrap', borderRadius: '12px', fontSize: '0.92rem', fontWeight: 700 }}>
                    {wallLoggingIn ? "Connecting..." : "Connect"}
                  </button>
                </div>
                {wallLoginError && <p style={{ color: '#c62828', margin: '10px 0 0', fontSize: '13px', fontWeight: 500 }}>{wallLoginError}</p>}
              </div>
            )}
          </div>

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
              <div style={{ position: 'relative' }}>
                <input
                  placeholder="com.webos.app.magicnum"
                  value={entry.appName}
                  onChange={(event) => handleAppNameChange(event.target.value)}
                  onKeyDown={handleAppNameKeyDown}
                  onFocus={() => entry.appName && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  required
                  style={{ width: '100%', boxSizing: 'border-box' }}
                />
                {showSuggestions && appSuggestions.length > 0 && (
                  <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    left: 0,
                    right: 0,
                    backgroundColor: 'rgba(255,251,245,0.98)',
                    border: '1px solid var(--line)',
                    borderRadius: '14px',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    zIndex: 100,
                    boxShadow: '0 8px 24px rgba(65,39,22,0.12)',
                    backdropFilter: 'blur(8px)',
                  }}>
                    {appSuggestions.map((app, idx) => {
                      const isActive = idx === activeSuggestionIndex;
                      return (
                        <div
                          key={idx}
                          onClick={() => handleSuggestionSelect(app)}
                          style={{
                            padding: '11px 16px',
                            cursor: 'pointer',
                            borderBottom: idx < appSuggestions.length - 1 ? '1px solid rgba(125,78,36,0.08)' : 'none',
                            backgroundColor: isActive ? 'rgba(184,92,56,0.08)' : 'transparent',
                            fontSize: '0.92rem',
                            fontFamily: '"Consolas", monospace',
                            color: isActive ? 'var(--brand-deep)' : 'var(--text)',
                            transition: 'background 0.15s',
                          }}
                          onMouseEnter={() => setActiveSuggestionIndex(idx)}
                          onMouseLeave={() => setActiveSuggestionIndex(-1)}
                        >
                          {app}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </label>

            <label className="field">
              <span>Tag</span>
              <input
                placeholder="230"
                value={entry.tag}
                onChange={(event) => {
                  setEntry({ ...entry, tag: event.target.value });
                  setFormError("");
                  setWallFetchError("");
                }}
                onBlur={(event) => loadSubmissionsFromWall(entry.appName, event.target.value)}
                required
              />
            </label>

            {/* Wall API Response Section */}
            {wallFetchLoading && (
              <div className="field field-full" style={{ padding: '14px 16px', background: 'linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%)', borderRadius: '14px', color: '#1565c0', fontSize: '0.92rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ display: 'inline-block', width: '16px', height: '16px', border: '2px solid #1565c0', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                Fetching tag details from Wall...
              </div>
            )}
            <div className="field field-full">
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                <span style={{ fontWeight: 600 }}>Submissions</span>
                <span style={{ color: '#c62828', fontSize: '13px' }}>*</span>
                {entry.submissions && (
                  <span style={{ fontSize: '11px', padding: '2px 8px', borderRadius: '10px', background: '#e8f5e9', color: '#2e7d32', fontWeight: 600 }}>Auto-filled</span>
                )}
              </label>
              <input
                name="submissions"
                placeholder="Auto-filled when a valid tag is fetched from Wall"
                value={entry.submissions}
                readOnly
                required
                style={{
                  background: entry.submissions ? '#f0fdf4' : '#fff8f8',
                  cursor: 'default',
                  border: entry.submissions ? '1px solid #a5d6a7' : '1px solid #ef9a9a',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  outline: 'none',
                  transition: 'border 0.2s, background 0.2s',
                }}
              />
              {wallFetchError && (
                <p style={{ color: '#c62828', margin: '6px 0 0', fontSize: '13px', fontWeight: 500 }}>
                  {wallFetchError}
                </p>
              )}
            </div>

            <label className="field field-full">
              <span>Submission Tag Details <span style={{ color: '#c62828' }}>*</span></span>
              <textarea
                rows="4"
                name="submissionTagDetails"
                placeholder="submissions/256..submissions/257&#10;e2a5227 [Dev] responsive"
                value={entry.submissionTagDetails}
                onChange={(event) => {
                  setEntry({ ...entry, submissionTagDetails: event.target.value });
                  setFormError("");
                }}
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
              <span>Issues Addressed (comma separated) <span style={{ color: '#c62828' }}>*</span></span>
              <textarea
                rows="3"
                placeholder="TVPLAT-836133, TVPLAT-840206, TVPLAT-861206"
                value={entry.issues}
                onChange={(event) => {
                  setEntry({ ...entry, issues: event.target.value });
                  setFormError("");
                }}
                required
              />
            </label>

            <label className="field">
              <span>Patch Link <span style={{ color: '#c62828' }}>*</span></span>
              <input
                placeholder="https://github.com/example/repo/pull/123"
                value={entry.patchLink}
                onChange={(event) => {
                  setEntry({ ...entry, patchLink: event.target.value });
                  setFormError("");
                }}
                required
              />
            </label>

          </div>

          {formError && (
            <p style={{ color: '#c62828', margin: '0', fontSize: '0.9rem', fontWeight: 600 }}>{formError}</p>
          )}

          <button className="primary-button" type="button" onClick={addEntry} style={{ width: '100%', padding: '14px', fontSize: '1rem', fontWeight: 800, borderRadius: '14px', letterSpacing: '0.04em' }}>
            ADD CCC
          </button>
        </div>

        <div className="panel stack-gap" style={{ position: 'sticky', top: '24px', alignSelf: 'start' }}>
          <div className="preview-card">
            <div className="preview-header">
              <div>
                <p className="eyebrow">Live output</p>
                <h2>CCC Preview ({selectedBranch})</h2>
              </div>
              <button
                type="button"
                onClick={() => { navigator.clipboard.writeText(previewText); }}
                style={{ padding: '6px 14px', borderRadius: '999px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: '#eff8f1', cursor: 'pointer', fontSize: '0.82rem', fontWeight: 600, transition: 'background 0.2s' }}
              >
                Copy
              </button>
            </div>
            <pre>{previewText}</pre>
          </div>
        </div>

      </section>
    </main>
  );
}