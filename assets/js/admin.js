/* ============================================================
   ADMIN.JS — no-code content manager for the portfolio
   Backend-driven: data is loaded from GET /api/portfolio, saved via
   PUT /api/portfolio, and images upload to Cloudinary via
   POST /api/upload-image. No localStorage / Store.js anymore.
   ============================================================ */
(function () {
  "use strict";

  var data = null;            // loaded after login from the API
  var loaded = false;         // whether data has been fetched at least once
  var $ = function (id) { return document.getElementById(id); };

  /* ---------- Toast ---------- */
  var toastT;
  function toast(msg, isErr) {
    var t = $("toast");
    t.textContent = msg;
    t.className = "toast show" + (isErr ? " err" : "");
    clearTimeout(toastT);
    toastT = setTimeout(function () { t.className = "toast"; }, 2600);
  }

  /* ---------- Persist current data to the backend (PUT) ---------- */
  // Optimistic: the local `data` object is already mutated and re-rendered;
  // this syncs it to MongoDB and reports success / failure.
  function persist(successMsg) {
    if (!data) { toast("Still loading — try again in a moment", true); return Promise.resolve(false); }
    return API.savePortfolio(data)
      .then(function (saved) {
        if (saved) data = saved;
        if (successMsg) toast(successMsg);
        return true;
      })
      .catch(function (err) {
        console.error("Save failed:", err);
        if (err.status === 401) {
          toast("Session expired — please log in again", true);
          lock();
        } else {
          toast(err.message || "Could not save to server", true);
        }
        return false;
      });
  }

  /* ---------- Login gate ---------- */
  function unlock() { $("gate").style.display = "none"; $("shell").style.display = "grid"; }
  function lock() {
    API.logout();
    loaded = false;
    $("shell").style.display = "none";
    $("gate").style.display = "grid";
    $("gatePass").value = "";
  }

  function loadData() {
    return API.getPortfolio()
      .then(function (d) {
        data = d || {};
        // Defensive defaults so the editors never crash on a fresh DB.
        data.profile = data.profile || {};
        data.experience = data.experience || [];
        data.projects = data.projects || [];
        data.skills = data.skills || [];
        data.education = data.education || [];
        data.certifications = data.certifications || [];
        loaded = true;
        renderAll();
      })
      .catch(function (err) {
        console.error("Load failed:", err);
        toast(err.message || "Could not load data from server", true);
      });
  }

  function tryLogin() {
    var v = $("gatePass").value;
    if (!v) { toast("Enter your password", true); return; }
    var btn = $("gateBtn");
    btn.disabled = true;
    API.login(v)
      .then(function () {
        unlock();
        return loadData();
      })
      .catch(function (err) {
        if (err.status === 401) toast("Incorrect password", true);
        else toast(err.message || "Login failed — is the server running?", true);
      })
      .finally(function () { btn.disabled = false; });
  }
  $("gateBtn").addEventListener("click", tryLogin);
  $("gatePass").addEventListener("keydown", function (e) { if (e.key === "Enter") tryLogin(); });
  $("logoutBtn").addEventListener("click", lock);

  /* ---------- Tabs ---------- */
  document.querySelectorAll(".nav-tab").forEach(function (tab) {
    tab.addEventListener("click", function () {
      document.querySelectorAll(".nav-tab").forEach(function (t) { t.classList.remove("active"); });
      document.querySelectorAll(".panel").forEach(function (p) { p.classList.remove("active"); });
      tab.classList.add("active");
      $("panel-" + tab.dataset.tab).classList.add("active");
    });
  });

  /* ---------- Modal helper ---------- */
  var overlay = $("modalOverlay"), modal = $("modal"), onSave = null;
  function openModal(title, bodyHTML, saveFn) {
    modal.innerHTML =
      "<h3>" + title + "</h3>" + bodyHTML +
      '<div class="modal-foot"><button class="b b-ghost" id="mCancel">Cancel</button>' +
      '<button class="b b-primary" id="mSave">Save</button></div>';
    overlay.classList.add("open");
    onSave = saveFn;
    $("mCancel").onclick = closeModal;
    $("mSave").onclick = function () { if (onSave) onSave(); };
  }
  function closeModal() { overlay.classList.remove("open"); onSave = null; }
  overlay.addEventListener("click", function (e) { if (e.target === overlay) closeModal(); });
  function mv(id) { var el = $(id); return el ? el.value.trim() : ""; }

  function field(label, id, val, ph) {
    return '<div class="field"><label>' + label + '</label><input id="' + id +
      '" value="' + attr(val) + '" placeholder="' + (ph || "") + '" /></div>';
  }
  function area(label, id, val, ph) {
    return '<div class="field"><label>' + label + '</label><textarea id="' + id +
      '" placeholder="' + (ph || "") + '">' + esc(val) + "</textarea></div>";
  }
  function esc(s) { return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;"); }
  function attr(s) { return String(s == null ? "" : s).replace(/"/g, "&quot;").replace(/</g, "&lt;"); }

  /* ============================================================
     PROFILE
     ============================================================ */
  function loadProfile() {
    var p = data.profile;
    $("f_name").value = p.name || "";
    $("f_role").value = p.role || "";
    $("f_tagline").value = p.tagline || "";
    $("f_about").value = p.about || "";
    $("f_location").value = p.location || "";
    $("f_phone").value = p.phone || "";
    $("f_email").value = p.email || "";
    $("f_linkedin").value = p.linkedin || "";
    $("f_github").value = p.github || "";
    $("f_resume").value = p.resumeUrl || "";
    $("imgPreview").src = p.image || API.DEFAULT_AVATAR;

    var stats = p.stats || [];
    var html = "";
    for (var i = 0; i < 3; i++) {
      var s = stats[i] || { value: "", label: "" };
      html += '<div class="row2" style="margin-bottom:10px">' +
        '<div class="field" style="margin:0"><input id="stat_v' + i + '" value="' + attr(s.value) + '" placeholder="Value e.g. 3+" /></div>' +
        '<div class="field" style="margin:0"><input id="stat_l' + i + '" value="' + attr(s.label) + '" placeholder="Label e.g. Years" /></div></div>';
    }
    $("statsEditor").innerHTML = html;
  }

  $("saveProfile").addEventListener("click", function () {
    if (!data) { toast("Still loading — try again in a moment", true); return; }
    var p = data.profile;
    p.name = $("f_name").value.trim();
    p.role = $("f_role").value.trim();
    p.tagline = $("f_tagline").value.trim();
    p.about = $("f_about").value.trim();
    p.location = $("f_location").value.trim();
    p.phone = $("f_phone").value.trim();
    p.email = $("f_email").value.trim();
    p.linkedin = $("f_linkedin").value.trim();
    p.github = $("f_github").value.trim();
    p.resumeUrl = $("f_resume").value.trim();
    p.stats = [];
    for (var i = 0; i < 3; i++) {
      var v = $("stat_v" + i).value.trim(), l = $("stat_l" + i).value.trim();
      if (v || l) p.stats.push({ value: v, label: l });
    }
    var btn = $("saveProfile");
    btn.disabled = true;
    persist("Profile saved ✓").finally(function () { btn.disabled = false; });
  });

  /* image upload — straight to Cloudinary, store the returned URL */
  $("imgPick").addEventListener("click", function () { $("imgFile").click(); });
  $("imgFile").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    if (!/^image\//.test(file.type)) { toast("Please choose an image file", true); return; }
    if (file.size > 8 * 1024 * 1024) { toast("Image too large (max 8 MB)", true); return; }

    toast("Uploading photo…");
    var pickBtn = $("imgPick");
    pickBtn.disabled = true;

    API.uploadImage(file)
      .then(function (url) {
        data.profile.image = url;
        $("imgPreview").src = url;
        // Persist the new URL immediately so it survives refresh.
        return persist("Photo updated ✓");
      })
      .catch(function (err) {
        console.error("Upload failed:", err);
        if (err.status === 401) { toast("Session expired — log in again", true); lock(); }
        else toast(err.message || "Image upload failed", true);
      })
      .finally(function () {
        pickBtn.disabled = false;
        $("imgFile").value = ""; // allow re-selecting the same file
      });
  });
  $("imgReset").addEventListener("click", function () {
    data.profile.image = API.DEFAULT_AVATAR;
    $("imgPreview").src = API.DEFAULT_AVATAR;
    persist("Photo reset");
  });

  /* ============================================================
     Generic list renderer
     ============================================================ */
  function renderList(mountId, arr, getTitle, getMeta, onEdit, onDelete, emptyMsg) {
    var mount = $(mountId);
    if (!arr.length) { mount.innerHTML = '<div class="empty">' + emptyMsg + "</div>"; return; }
    mount.innerHTML = arr.map(function (item, i) {
      return '<div class="item">' +
        '<div class="item-body"><div class="item-title">' + esc(getTitle(item)) + "</div>" +
        '<div class="item-meta">' + esc(getMeta(item)) + "</div></div>" +
        '<div class="item-acts">' +
        '<button class="icon-btn" data-edit="' + i + '" title="Edit">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4z"/></svg></button>' +
        '<button class="icon-btn del" data-del="' + i + '" title="Delete">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m2 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6"/></svg></button>' +
        "</div></div>";
    }).join("");
    mount.querySelectorAll("[data-edit]").forEach(function (b) {
      b.onclick = function () { onEdit(+b.dataset.edit); };
    });
    mount.querySelectorAll("[data-del]").forEach(function (b) {
      b.onclick = function () {
        if (confirm("Delete this item?")) { onDelete(+b.dataset.del); }
      };
    });
  }

  /* ============================================================
     EXPERIENCE
     ============================================================ */
  function renderExp() {
    renderList("expList", data.experience,
      function (e) { return e.role; },
      function (e) { return e.company + "  ·  " + e.period; },
      editExp, function (i) { data.experience.splice(i, 1); renderExp(); persist("Deleted"); },
      "No experience yet. Add your first role.");
  }
  function editExp(i) {
    var isNew = i == null;
    var e = isNew ? { role: "", company: "", mode: "", period: "", tech: "", points: [] } : data.experience[i];
    openModal(isNew ? "Add experience" : "Edit experience",
      field("Role / title", "e_role", e.role, "Full Stack Developer") +
      '<div class="row2">' + field("Company", "e_company", e.company) + field("Mode", "e_mode", e.mode, "Remote / Onsite") + "</div>" +
      field("Period", "e_period", e.period, "Jan 2024 – Jan 2025") +
      field("Tech stack", "e_tech", e.tech, "React, Node.js, MongoDB") +
      area("Bullet points (one per line)", "e_points", (e.points || []).join("\n")),
      function () {
        var obj = {
          role: mv("e_role"), company: mv("e_company"), mode: mv("e_mode"),
          period: mv("e_period"), tech: mv("e_tech"),
          points: $("e_points").value.split("\n").map(function (s) { return s.trim(); }).filter(Boolean)
        };
        if (!obj.role) { toast("Role is required", true); return; }
        if (isNew) data.experience.push(obj); else data.experience[i] = obj;
        renderExp(); closeModal(); persist("Saved ✓");
      });
  }
  $("addExp").addEventListener("click", function () { editExp(null); });

  /* ============================================================
     PROJECTS
     ============================================================ */
  function renderProj() {
    renderList("projList", data.projects,
      function (p) { return p.title; },
      function (p) { return (p.tags || []).join(", "); },
      editProj, function (i) { data.projects.splice(i, 1); renderProj(); persist("Deleted"); },
      "No projects yet. Add your first project.");
  }
  function editProj(i) {
    var isNew = i == null;
    var p = isNew ? { title: "", desc: "", tags: [], link: "" } : data.projects[i];
    openModal(isNew ? "Add project" : "Edit project",
      field("Title", "p_title", p.title) +
      area("Description", "p_desc", p.desc) +
      field("Tags (comma separated)", "p_tags", (p.tags || []).join(", "), "React, Node.js, AI") +
      field("Project link (optional)", "p_link", p.link, "https://…"),
      function () {
        var obj = {
          title: mv("p_title"), desc: mv("p_desc"),
          tags: $("p_tags").value.split(",").map(function (s) { return s.trim(); }).filter(Boolean),
          link: mv("p_link")
        };
        if (!obj.title) { toast("Title is required", true); return; }
        if (isNew) data.projects.push(obj); else data.projects[i] = obj;
        renderProj(); closeModal(); persist("Saved ✓");
      });
  }
  $("addProj").addEventListener("click", function () { editProj(null); });

  /* ============================================================
     SKILLS
     ============================================================ */
  function renderSkill() {
    renderList("skillList", data.skills,
      function (s) { return s.category; },
      function (s) { return (s.items || []).join(", "); },
      editSkill, function (i) { data.skills.splice(i, 1); renderSkill(); persist("Deleted"); },
      "No skill categories yet.");
  }
  function editSkill(i) {
    var isNew = i == null;
    var s = isNew ? { category: "", items: [] } : data.skills[i];
    openModal(isNew ? "Add category" : "Edit category",
      field("Category name", "s_cat", s.category, "Frontend") +
      area("Skills (comma separated)", "s_items", (s.items || []).join(", "), "React, Next.js, CSS"),
      function () {
        var obj = {
          category: mv("s_cat"),
          items: $("s_items").value.split(",").map(function (x) { return x.trim(); }).filter(Boolean)
        };
        if (!obj.category) { toast("Category name required", true); return; }
        if (isNew) data.skills.push(obj); else data.skills[i] = obj;
        renderSkill(); closeModal(); persist("Saved ✓");
      });
  }
  $("addSkill").addEventListener("click", function () { editSkill(null); });

  /* ============================================================
     EDUCATION
     ============================================================ */
  function renderEdu() {
    renderList("eduList", data.education,
      function (e) { return e.degree; },
      function (e) { return e.school + "  ·  " + e.period; },
      editEdu, function (i) { data.education.splice(i, 1); renderEdu(); persist("Deleted"); },
      "No education entries yet.");
  }
  function editEdu(i) {
    var isNew = i == null;
    var e = isNew ? { school: "", degree: "", period: "", location: "", detail: "" } : data.education[i];
    openModal(isNew ? "Add education" : "Edit education",
      field("Degree", "ed_degree", e.degree, "BS Computer Science") +
      field("School / institute", "ed_school", e.school) +
      '<div class="row2">' + field("Period", "ed_period", e.period, "2022 – 2026") + field("Location", "ed_location", e.location) + "</div>" +
      field("Detail (e.g. GPA)", "ed_detail", e.detail, "GPA: 3.40 / 4.00"),
      function () {
        var obj = {
          degree: mv("ed_degree"), school: mv("ed_school"), period: mv("ed_period"),
          location: mv("ed_location"), detail: mv("ed_detail")
        };
        if (!obj.degree) { toast("Degree is required", true); return; }
        if (isNew) data.education.push(obj); else data.education[i] = obj;
        renderEdu(); closeModal(); persist("Saved ✓");
      });
  }
  $("addEdu").addEventListener("click", function () { editEdu(null); });

  /* ============================================================
     CERTIFICATIONS
     ============================================================ */
  function renderCert() {
    renderList("certList", data.certifications,
      function (c) { return c.name; },
      function (c) { return c.issuer; },
      editCert, function (i) { data.certifications.splice(i, 1); renderCert(); persist("Deleted"); },
      "No certifications yet.");
  }
  function editCert(i) {
    var isNew = i == null;
    var c = isNew ? { name: "", issuer: "" } : data.certifications[i];
    openModal(isNew ? "Add certification" : "Edit certification",
      field("Certification name", "c_name", c.name) +
      field("Issuer", "c_issuer", c.issuer, "Microsoft / Coursera"),
      function () {
        var obj = { name: mv("c_name"), issuer: mv("c_issuer") };
        if (!obj.name) { toast("Name is required", true); return; }
        if (isNew) data.certifications.push(obj); else data.certifications[i] = obj;
        renderCert(); closeModal(); persist("Saved ✓");
      });
  }
  $("addCert").addEventListener("click", function () { editCert(null); });

  /* ============================================================
     SETTINGS
     ============================================================ */
  // The admin password is now a server-side secret (ADMIN_PASSWORD env var),
  // so it can't be changed from the browser. Explain that clearly.
  $("savePass").addEventListener("click", function () {
    toast("Password is set on the server (ADMIN_PASSWORD env var)", true);
  });

  // Export the current content as a JSON backup.
  $("exportBtn").addEventListener("click", function () {
    if (!loaded) { toast("Nothing to export yet", true); return; }
    var blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "portfolio-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Backup downloaded ✓");
  });

  // Import a JSON backup and push it to the database.
  $("importBtn").addEventListener("click", function () { $("importFile").click(); });
  $("importFile").addEventListener("change", function (e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function (ev) {
      try {
        var obj = JSON.parse(ev.target.result);
        if (typeof obj !== "object" || obj === null) throw new Error("bad");
        data = obj;
        data.profile = data.profile || {};
        data.experience = data.experience || [];
        data.projects = data.projects || [];
        data.skills = data.skills || [];
        data.education = data.education || [];
        data.certifications = data.certifications || [];
        renderAll();
        persist("Data imported & saved ✓");
      } catch (err) { toast("Invalid JSON file", true); }
      finally { $("importFile").value = ""; }
    };
    r.readAsText(f);
  });

  // Reset to the original résumé defaults (server re-seeds an empty DB on next read).
  // Without a dedicated reset endpoint we re-seed by importing a backup instead.
  $("resetBtn").addEventListener("click", function () {
    toast("To restore defaults, drop the DB document — or import a backup", true);
  });

  /* ---------- Render everything ---------- */
  function renderAll() {
    if (!data) return;
    loadProfile();
    renderExp();
    renderProj();
    renderSkill();
    renderEdu();
    renderCert();
  }

  /* If a valid session key is already present (e.g. soft refresh), skip the gate. */
  if (API.isAuthed()) {
    unlock();
    loadData();
  }
})();
