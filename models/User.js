const mongoose = require("mongoose");
const { ObjectId } = mongoose.Schema;

const UserSchema = new mongoose.Schema(
  {
    name: String,
    number: String,
  },
  { timestamps: false }
);

module.exports = mongoose.model("UserModel", UserSchema);
