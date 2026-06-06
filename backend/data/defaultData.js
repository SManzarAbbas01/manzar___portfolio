/* ============================================================
   data/defaultData.js — résumé seed data
   Used to seed MongoDB on first run so the live site is never empty.
   Mirrors the original front-end defaults 1:1.
   ============================================================ */
"use strict";

// A clean default avatar (SVG monogram) used until a real photo is uploaded.
const DEFAULT_AVATAR =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="720" viewBox="0 0 600 720">' +
      '<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">' +
      '<stop offset="0" stop-color="#1b1f26"/><stop offset="1" stop-color="#0d0f13"/>' +
      "</linearGradient></defs>" +
      '<rect width="600" height="720" fill="url(#g)"/>' +
      '<circle cx="300" cy="290" r="120" fill="none" stroke="#f5c451" stroke-width="3" opacity="0.5"/>' +
      '<text x="300" y="330" font-family="Syne, sans-serif" font-size="160" font-weight="800" ' +
      'fill="#f5c451" text-anchor="middle">MA</text>' +
      '<text x="300" y="470" font-family="JetBrains Mono, monospace" font-size="26" ' +
      'fill="#8b9099" text-anchor="middle" letter-spacing="6">UPLOAD PHOTO</text>' +
      "</svg>"
  );

const DEFAULT_DATA = {
  profile: {
    name: "Manzar Abbas",
    role: "Full Stack Developer & AI Engineer",
    tagline:
      "I design, build and ship production-ready web, mobile and machine-learning systems end to end.",
    location: "Karachi, Pakistan",
    phone: "+92 312 1340916",
    email: "manziabbas512@gmail.com",
    linkedin: "https://www.linkedin.com/",
    github: "https://github.com/SManzarAbbas01",
    resumeUrl: "FinalResume.pdf",
    about:
      "Full Stack Developer and AI Engineer specializing in end-to-end web and mobile development and machine-learning and deep-learning–based systems. Experienced in designing, deploying and maintaining production-ready applications using modern full-stack technologies and AI models.",
    image: DEFAULT_AVATAR,
    stats: [
      { value: "3+", label: "Years building" },
      { value: "10+", label: "Projects shipped" },
      { value: "13+", label: "Certifications" },
    ],
  },

  experience: [
    {
      role: "Full Stack & Mobile Application Developer",
      company: "Cuptoopia Inc, USA",
      mode: "Remote",
      period: "Jan 2024 – Jan 2025",
      tech: "React, Next.js, Node.js, Express, MongoDB, Flutter, REST APIs",
      points: [
        "Developed and maintained production platforms including unhouseddocs, casshey and moneymouthy.",
        "Built authentication systems, RESTful backend services and responsive UI components.",
        "Contributed to cross-platform mobile application development using Flutter.",
      ],
    },
    {
      role: "Full Stack Developer & AI Engineer",
      company: "Freelancer",
      mode: "Remote",
      period: "March 2023 – Present",
      tech: "React, Next.js, MERN Stack, Python, Scikit-learn, TensorFlow, AWS",
      points: [
        "Delivered client-facing web applications including homeland and fixora360.",
        "Designed and implemented AI-driven features and ML pipelines.",
        "Managed deployments and production environments.",
      ],
    },
    {
      role: "Full Stack Developer Intern",
      company: "MAS Tech (MAS Group of Companies)",
      mode: "Onsite",
      period: "Jun 2025 – Jul 2025",
      tech: "React, Next.js, Django, Django REST Framework, Python",
      points: [
        "Developed both frontend and backend components for the Finexa AI Chatbot.",
        "Designed and implemented RESTful APIs using Django and Django REST Framework.",
        "Integrated frontend applications with backend services and AI-driven features.",
      ],
    },
  ],

  projects: [
    {
      title: "Silent Confusion Detection System",
      desc: "A machine-learning system that detects silent confusion from behavioural and physiological signals.",
      tags: ["Machine Learning", "Python", "CNN"],
      link: "",
    },
    {
      title: "AI-Enabled Personalized Tutor",
      desc: "Web and mobile application delivering personalised tutoring powered by AI.",
      tags: ["AI", "React", "Flutter"],
      link: "",
    },
    {
      title: "ER Demand Prediction — UAE Hospitals",
      desc: "Predictive model forecasting emergency-room demand across UAE hospitals.",
      tags: ["ML", "Forecasting", "Scikit-learn"],
      link: "",
    },
    {
      title: "Energy Theft Detection",
      desc: "Machine-learning pipeline that flags anomalous consumption to detect energy theft.",
      tags: ["Machine Learning", "Anomaly Detection"],
      link: "",
    },
    {
      title: "Leelafbylaiba — E-Commerce",
      desc: "Full MERN-stack e-commerce platform with cart, auth and admin management.",
      tags: ["MERN", "MongoDB", "Express"],
      link: "",
    },
    {
      title: "Blog CMS",
      desc: "Content-management system for blogs built on the MERN stack.",
      tags: ["MERN", "React", "Node.js"],
      link: "",
    },
    {
      title: "Task Management App",
      desc: "Web application for organising, tracking and prioritising tasks.",
      tags: ["React", "Node.js"],
      link: "",
    },
    {
      title: "Real-Time Weather App",
      desc: "Live weather application consuming real-time APIs with a responsive UI.",
      tags: ["JavaScript", "REST API"],
      link: "",
    },
  ],

  skills: [
    { category: "Languages", items: ["JavaScript", "Python", "C++", "C", "Java"] },
    { category: "Frontend", items: ["HTML", "CSS", "React", "Next.js", "Bootstrap"] },
    { category: "Backend", items: ["Node.js", "Express", "Flask", "Django", "REST APIs"] },
    { category: "Databases", items: ["MongoDB", "MySQL", "Firebase"] },
    {
      category: "AI & ML",
      items: ["EDA", "Feature Engineering", "ANN", "CNN", "Supervised Learning", "Unsupervised Learning"],
    },
    { category: "Tools & Cloud", items: ["Git", "Docker", "AWS EC2", "Netlify", "Render"] },
    { category: "Mobile", items: ["Flutter", "Kotlin (Jetpack Compose)"] },
  ],

  education: [
    {
      school: "Sukkur Institute of Business Administration",
      degree: "Bachelor of Science in Computer Science",
      period: "2022 – 2026",
      location: "Sukkur, Pakistan",
      detail: "GPA: 3.40 / 4.00",
    },
  ],

  certifications: [
    { name: "Plan and Prepare to Develop AI Solutions on Azure", issuer: "Microsoft" },
    { name: "Analyze Text with Azure Language", issuer: "Microsoft" },
    { name: "Introduction to Generative AI and Agents", issuer: "Microsoft" },
    { name: "Introduction to AI-Powered Information Extraction Concepts", issuer: "Microsoft" },
    { name: "Introduction to Computer Vision Concepts", issuer: "Microsoft" },
    { name: "Introduction to AI Speech Concepts", issuer: "Microsoft" },
    { name: "Introduction to Machine Learning Concepts", issuer: "Microsoft" },
    { name: "Introduction to Text Analysis Concepts", issuer: "Microsoft" },
    { name: "Overview of AI Concepts", issuer: "Microsoft" },
    { name: "Generative AI", issuer: "Great Learning" },
    { name: "Data Science", issuer: "BCG X" },
    { name: "Data Visualization", issuer: "Tata" },
    { name: "Full Stack Web Development", issuer: "Coursera" },
  ],
};

module.exports = { DEFAULT_DATA, DEFAULT_AVATAR };
