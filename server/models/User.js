const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        "Please enter a valid email",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never returned in queries by default
    },
    avatar:   { type: String, default: "" },
    bio:      { type: String, default: "", maxlength: 200 },
    status:   { type: String, enum: ["online", "offline", "away"], default: "offline" },
    lastSeen: { type: Date, default: Date.now },
    role:     { type: String, enum: ["user", "admin"], default: "user" },
    workspaces: [{ type: mongoose.Schema.Types.ObjectId, ref: "Workspace" }],
  },
  { timestamps: true }
);

// ─────────────────────────────────────────────────────────────
// ✅ FIXED: Mongoose 7+ async pre-save hook — NO next() needed
// Just use async/await — Mongoose handles the promise automatically
// ─────────────────────────────────────────────────────────────
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return; // only hash if password changed
  const salt = await bcrypt.genSalt(12);
  this.password = await bcrypt.hash(this.password, salt);
});

// Compare typed password with stored hash
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Safe user object — never includes password
userSchema.methods.toPublicJSON = function () {
  return {
    _id:       this._id,
    name:      this.name,
    email:     this.email,
    avatar:    this.avatar,
    bio:       this.bio,
    status:    this.status,
    lastSeen:  this.lastSeen,
    role:      this.role,
    createdAt: this.createdAt,
  };
};

module.exports = mongoose.model("User", userSchema);