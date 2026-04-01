const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

mongoose.connect("mongodb://127.0.0.1:27017/cccDB");

const CCC = mongoose.model("CCC", new mongoose.Schema({
  branchEntries: Object,
  branchMeta: Object,
  timestamp: { type: Date, default: Date.now }
}));

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

app.post("/api/wall-fetch", async (req, res) => {
  const { appName, tag } = req.body;
  if (!appName || !tag) {
    return res.status(400).send({ error: "appName and tag are required" });
  }
  try {
    const url = `https://wall.lge.com/admin/repos/${encodeURIComponent(appName)},tags/q/filter:submissions%252F${encodeURIComponent(tag)}`;
    const response = await fetch(url);
    if (!response.ok) {
      return res.status(response.status).send({ error: "Failed to fetch from wall API" });
    }
    const data = await response.text(); // assuming HTML
    // For now, mock the submissions extraction
    const mockSubmissions = `submissions/${tag}..submissions/${parseInt(tag) + 1}`;
    const mockTagDetails = `${mockSubmissions}\n13a8db7 [Fix] Bluetooth sound icon appears small`;
    res.send({ submissions: mockSubmissions, submissionTagDetails: mockTagDetails });
  } catch (error) {
    console.error("Wall fetch error:", error);
    res.status(500).send({ error: "Internal server error" });
  }
});

app.listen(5000, "0.0.0.0", ()=>console.log("Backend running on http://0.0.0.0:5000"));