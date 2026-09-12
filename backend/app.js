const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Wish = require("./Wish");
const dns = require("dns");
const app = express();
dns.setServers(["1.1.1.1", "8.8.8.8"]);

app.use(cors());
app.use(express.json());
async function connectDB() {
  try {
    await mongoose.connect(
      "mongodb+srv://bibekjana68_db_user:6qept7aChFaB7V71@cluster0.0ko9qo2.mongodb.net/?appName=Cluster0",
    );

    console.log("Connected to MongoDB");
  } catch (error) {
    console.error("MongoDB connection error:", error);
  }
}

connectDB();
const PORT = "https://birthday-qou0.onrender.com" || 8080;
app.listen(PORT, () => {
  console.log("hi");
  console.log("hi");
});
app.post("/api/wishes", async (req, res) => {
  try {
    const { name, message } = req.body;
    console.log(name);
    if (!message || !message.trim()) {
      return res.status(400).json({
        error: "message is required",
      });
    }

    const wish = await Wish.create({
      name: name?.trim() || "Anonymous",
      message: message.trim(),
    });

    res.status(201).json(wish);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "something went wrong saving the wish",
    });
  }
});

app.get("/api/wishes", async (req, res) => {
  try {
    const wishes = await Wish.find().sort({
      createdAt: -1,
    });

    res.json(wishes);
  } catch (err) {
    console.error(err);

    res.status(500).json({
      error: "something went wrong fetching wishes",
    });
  }
});
