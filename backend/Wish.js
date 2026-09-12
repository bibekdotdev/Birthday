const mongoose = require("mongoose");

const wishSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "Anonymous",
    },
    message: {
      type: String,
      required: [true, "message is required"],
      trim: true,
      maxlength: 300,
    },
  },
  { timestamps: true }, // adds createdAt / updatedAt automatically
);

module.exports = mongoose.model("Wish", wishSchema);
