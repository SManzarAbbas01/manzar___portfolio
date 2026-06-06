/* ============================================================
   models/Portfolio.js — Mongoose schema for the whole portfolio.
   Stored as a single "singleton" document. Only image URLs are ever
   persisted (Cloudinary secure_url) — never base64 / binary.
   ============================================================ */
"use strict";

const mongoose = require("mongoose");
const { Schema } = mongoose;

/* ---------- Sub-schemas (no separate _id on embedded docs) ---------- */

const StatSchema = new Schema(
  {
    value: { type: String, trim: true, default: "" },
    label: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const ProfileSchema = new Schema(
  {
    name: { type: String, trim: true, default: "" },
    role: { type: String, trim: true, default: "" },
    tagline: { type: String, trim: true, default: "" },
    about: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    phone: { type: String, trim: true, default: "" },
    email: { type: String, trim: true, default: "" },
    linkedin: { type: String, trim: true, default: "" },
    github: { type: String, trim: true, default: "" },
    resumeUrl: { type: String, trim: true, default: "" },
    // Image is a URL string (Cloudinary secure_url) or the default SVG data-URI.
    image: { type: String, default: "" },
    stats: { type: [StatSchema], default: [] },
  },
  { _id: false }
);

const ExperienceSchema = new Schema(
  {
    role: { type: String, trim: true, default: "" },
    company: { type: String, trim: true, default: "" },
    mode: { type: String, trim: true, default: "" },
    period: { type: String, trim: true, default: "" },
    tech: { type: String, trim: true, default: "" },
    points: { type: [String], default: [] },
  },
  { _id: false }
);

const ProjectSchema = new Schema(
  {
    title: { type: String, trim: true, default: "" },
    desc: { type: String, trim: true, default: "" },
    tags: { type: [String], default: [] },
    link: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const SkillSchema = new Schema(
  {
    category: { type: String, trim: true, default: "" },
    items: { type: [String], default: [] },
  },
  { _id: false }
);

const EducationSchema = new Schema(
  {
    school: { type: String, trim: true, default: "" },
    degree: { type: String, trim: true, default: "" },
    period: { type: String, trim: true, default: "" },
    location: { type: String, trim: true, default: "" },
    detail: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

const CertificationSchema = new Schema(
  {
    name: { type: String, trim: true, default: "" },
    issuer: { type: String, trim: true, default: "" },
  },
  { _id: false }
);

/* ---------- Root document ---------- */

const PortfolioSchema = new Schema(
  {
    // Marks the single canonical document so we always read/write the same one.
    singleton: {
      type: String,
      default: "main",
      unique: true,
      index: true,
    },
    profile: { type: ProfileSchema, default: () => ({}) },
    experience: { type: [ExperienceSchema], default: [] },
    projects: { type: [ProjectSchema], default: [] },
    skills: { type: [SkillSchema], default: [] },
    education: { type: [EducationSchema], default: [] },
    certifications: { type: [CertificationSchema], default: [] },
  },
  {
    timestamps: true, // createdAt / updatedAt
    minimize: false,
  }
);

module.exports = mongoose.model("Portfolio", PortfolioSchema);
