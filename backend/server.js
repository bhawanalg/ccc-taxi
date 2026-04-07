const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

// Disable caching for API endpoints
app.use((req, res, next) => {
  res.set('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  next();
});

mongoose.connect("mongodb://127.0.0.1:27017/cccDB");

const CCC = mongoose.model("CCC", new mongoose.Schema({
  branchEntries: Object,
  branchMeta: Object,
  timestamp: { type: Date, default: Date.now }
}));

const Application = mongoose.model("Application", new mongoose.Schema({
  applications: { type: [String], default: [] },
  timestamp: { type: Date, default: Date.now }
}, { collection: "applications" }));

app.post("/api/ccc", async (req,res)=>{
  const { branchEntries, branchMeta } = req.body;
  await new CCC({ branchEntries, branchMeta }).save();
  res.send({ok:true});
});

app.get("/api/ccc", async (req,res)=>{
  const allCCC = await CCC.find({}).sort({ timestamp: 1 });
  res.send(allCCC);
});

app.delete("/api/ccc/:id", async (req,res)=>{
  const { id } = req.params;
  try {
    const deleted = await CCC.findByIdAndDelete(id);
    if (!deleted) {
      return res.status(404).send({ ok: false, message: "Record not found" });
    }
    const remaining = await CCC.find({}).sort({ timestamp: 1 });
    res.send({ ok: true, remaining });
  } catch (error) {
    console.error("Delete error", error);
    res.status(500).send({ ok: false, message: "Delete failed" });
  }
});

app.get("/api/applications/search", async (req, res) => {
  try {
    const { q } = req.query;
    const appDoc = await Application.findOne();
    
    if (!appDoc || !appDoc.applications) {
      return res.send([]);
    }
    
    if (!q) {
      return res.send(appDoc.applications.slice(0, 10));
    }
    
    const searchRegex = new RegExp(q, "i");
    const filtered = appDoc.applications.filter(name => searchRegex.test(name)).slice(0, 10);
    res.send(filtered);
  } catch (error) {
    console.error("Search error:", error);
    res.status(500).send({ error: "Search failed" });
  }
});

app.post("/api/applications", async (req, res) => {
  try {
    const { application } = req.body;
    if (!application) {
      return res.status(400).send({ error: "Application name is required" });
    }
    
    let appDoc = await Application.findOne();
    
    if (!appDoc) {
      appDoc = new Application({ applications: [application] });
    } else {
      if (appDoc.applications.includes(application)) {
        return res.status(400).send({ error: "Application already exists" });
      }
      appDoc.applications.push(application);
    }
    
    await appDoc.save();
    res.send({ ok: true, applications: appDoc.applications });
  } catch (error) {
    console.error("Add application error:", error);
    res.status(500).send({ error: "Failed to add application" });
  }
});

// ─── Wall / Gerrit helpers ───
const WALL_BASE = "https://wall.lge.com";

function buildBasicAuthHeader(username, password) {
  return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
}

async function callWall(path, username, password) {
  const url = `${WALL_BASE}${path}`;
  console.log("Calling Wall:", url);
  const res = await fetch(url, {
    headers: {
      Authorization: buildBasicAuthHeader(username, password),
      Accept: "application/json",
    },
    redirect: "manual",
  });

  // If redirected (e.g. to login page), auth failed
  if (res.status >= 300 && res.status < 400) {
    const location = res.headers.get("location") || "";
    throw new Error(`AUTH_REDIRECT: Wall redirected to ${location} — credentials may be invalid`);
  }

  const text = await res.text();
  console.log("Wall response status:", res.status, "body preview:", text.slice(0, 200));

  if (!res.ok) {
    const short = text.length > 200 ? text.slice(0, 200) + "..." : text;
    throw new Error(`Wall API error ${res.status} ${res.statusText}: ${short}`);
  }

  // If server returned HTML instead of JSON, it's likely a login page
  if (text.trimStart().startsWith("<!DOCTYPE") || text.trimStart().startsWith("<html")) {
    throw new Error("AUTH_HTML: Wall returned HTML instead of JSON — credentials may be invalid or session expired");
  }

  // Gerrit JSON responses are XSSI-protected with a leading ")]}'" line — strip it
  const stripped = text.startsWith(")]}'") ? text.replace(/^\)\]\}'\n?/, "") : text;

  try {
    return JSON.parse(stripped);
  } catch (err) {
    throw new Error("Failed to parse Wall response JSON: " + err + "\n" + stripped.slice(0, 400));
  }
}

// Validate Wall credentials by calling /a/accounts/self/detail
app.post("/api/wall-login", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send({ error: "username and password are required" });
  }
  try {
    const account = await callWall("/a/accounts/self/detail", username, password);
    return res.send({ ok: true, account });
  } catch (error) {
    console.error("Wall login error:", error.message);
    return res.status(401).send({ error: "Invalid Wall credentials", details: error.message });
  }
});

// Fetch tag details using authenticated Wall call
app.post("/api/wall-fetch", async (req, res) => {
  const { appName, tag, username, password } = req.body;
  if (!appName || !tag) {
    return res.status(400).send({ error: "appName and tag are required" });
  }
  if (!username || !password) {
    return res.status(401).send({ error: "Wall credentials are required. Please login first.", needsLogin: true });
  }
  try {
    const encodedAppName = encodeURIComponent(`app/${appName}`);
    const path = `/a/projects/${encodedAppName}/tags?n=26&S=0&m=${encodeURIComponent(tag)}`;

    const data = await callWall(path, username, password);

    let revision = "";
    let resource = "";
    let submissionDetails = "";

    if (Array.isArray(data)) {
      // Try exact match on ref, message, or tag fields
      let tagData = data.find((item) =>
        item.ref === `refs/tags/submissions/${tag}` ||
        item.ref === `refs/tags/${tag}` ||
        item.message === `submissions/${tag}` ||
        item.message === tag ||
        item.tag === tag ||
        item.m === tag
      );
      // If no exact match, fall back to first result
      if (!tagData && data.length > 0) {
        tagData = data[0];
      }
      if (tagData) {
        revision = tagData.revision || "";
        resource = tagData.resource || "";
        submissionDetails = resource || revision || "";
      }
    } else if (data && typeof data === "object") {
      resource = data.resource || "";
      revision = data.revision || "";
      submissionDetails = resource || revision || "";

      if (!submissionDetails && Array.isArray(data.tags)) {
        const tagData = data.tags.find((item) => item.tag === tag || item.m === tag);
        if (tagData) {
          resource = tagData.resource || "";
          revision = tagData.revision || revision;
          submissionDetails = resource || revision || "";
        }
      }
    }

    return res.send({
      submissions: submissionDetails,
      submissionTagDetails: submissionDetails,
      revision,
      resource,
      raw: data,
    });
  } catch (error) {
    console.error("Wall fetch error:", error.message);
    if (error.message.includes("401") || error.message.includes("AUTH_")) {
      return res.status(401).send({ error: "Authentication failed — check your Wall credentials", needsLogin: true });
    }
    return res.status(500).send({ error: error.message });
  }
});

app.listen(5001, "0.0.0.0", ()=>console.log("Backend running on http://0.0.0.0:5001"));