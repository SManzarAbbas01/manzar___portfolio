/* ============================================================
   ADMIN.JS — no-code content manager for the portfolio
   ============================================================ */
(function () {
  "use strict";

  var data = Store.getData();
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

  function persist() { Store.saveData(data); }

  /* ---------- Login gate ---------- */
  function unlock() { $("gate").style.display = "none"; $("shell").style.display = "grid"; }
  function tryLogin() {
    var v = $("gatePass").value;
    if (v === Store.getPassword()) { unlock(); renderAll(); }
    else toast("Incorrect password", true);
  }
  $("gateBtn").addEventListener("click", tryLogin);
  $("gatePass").addEventListener("keydown", function (e) { if (e.key === "Enter") tryLogin(); });
  $("logoutBtn").addEventListener("click", function () {
    $("shell").style.display = "none"; $("gate").style.display = "grid"; $("gatePass").value = "";
  });

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
    $("imgPreview").src = p.image || Store.DEFAULT_AVATAR;

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
    persist();
    toast("Profile saved ✓");
  });

  /* image upload */
  $("imgPick").addEventListener("click", function () { $("imgFile").click(); });
  $("imgFile").addEventListener("change", function (e) {
    var file = e.target.files[0];
    if (!file) return;
    if (file.size > 2.2 * 1024 * 1024) {
      toast("Image is large — compressing…");
    }
    var reader = new FileReader();
    reader.onload = function (ev) {
      // downscale via canvas to keep localStorage happy
      var img = new Image();
      img.onload = function () {
        var max = 900;
        var w = img.width, h = img.height;
        if (w > max || h > max) {
          if (w > h) { h = Math.round(h * max / w); w = max; }
          else { w = Math.round(w * max / h); h = max; }
        }
        var c = document.createElement("canvas");
        c.width = w; c.height = h;
        c.getContext("2d").drawImage(img, 0, 0, w, h);
        var out = c.toDataURL("image/jpeg", 0.85);
        data.profile.image = out;
        $("imgPreview").src = out;
        if (persist()) toast("Photo updated ✓ — don't forget it's saved");
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
  });
  $("imgReset").addEventListener("click", function () {
    data.profile.image = Store.DEFAULT_AVATAR;
    $("imgPreview").src = Store.DEFAULT_AVATAR;
    persist();
    toast("Photo reset");
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
      editExp, function (i) { data.experience.splice(i, 1); persist(); renderExp(); toast("Deleted"); },
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
        persist(); renderExp(); closeModal(); toast("Saved ✓");
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
      editProj, function (i) { data.projects.splice(i, 1); persist(); renderProj(); toast("Deleted"); },
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
        persist(); renderProj(); closeModal(); toast("Saved ✓");
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
      editSkill, function (i) { data.skills.splice(i, 1); persist(); renderSkill(); toast("Deleted"); },
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
        persist(); renderSkill(); closeModal(); toast("Saved ✓");
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
      editEdu, function (i) { data.education.splice(i, 1); persist(); renderEdu(); toast("Deleted"); },
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
        persist(); renderEdu(); closeModal(); toast("Saved ✓");
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
      editCert, function (i) { data.certifications.splice(i, 1); persist(); renderCert(); toast("Deleted"); },
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
        persist(); renderCert(); closeModal(); toast("Saved ✓");
      });
  }
  $("addCert").addEventListener("click", function () { editCert(null); });

  /* ============================================================
     SETTINGS
     ============================================================ */
  $("savePass").addEventListener("click", function () {
    var v = $("newPass").value.trim();
    if (v.length < 4) { toast("Use at least 4 characters", true); return; }
    Store.setPassword(v); $("newPass").value = "";
    toast("Password updated ✓");
  });

  $("exportBtn").addEventListener("click", function () {
    var blob = new Blob([Store.exportJSON()], { type: "application/json" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = "portfolio-data.json";
    a.click();
    URL.revokeObjectURL(a.href);
    toast("Backup downloaded ✓");
  });

  $("importBtn").addEventListener("click", function () { $("importFile").click(); });
  $("importFile").addEventListener("change", function (e) {
    var f = e.target.files[0]; if (!f) return;
    var r = new FileReader();
    r.onload = function (ev) {
      try {
        data = Store.importJSON(ev.target.result);
        renderAll();
        toast("Data imported ✓");
      } catch (err) { toast("Invalid JSON file", true); }
    };
    r.readAsText(f);
  });

  $("resetBtn").addEventListener("click", function () {
    if (!confirm("Reset ALL content to the original résumé data? This cannot be undone.")) return;
    data = Store.resetData();
    renderAll();
    toast("Content reset to defaults");
  });

  /* ---------- Render everything ---------- */
  function renderAll() {
    loadProfile();
    renderExp();
    renderProj();
    renderSkill();
    renderEdu();
    renderCert();
  }

  /* If already past gate (e.g. dev), nothing happens until login.
     Pre-render lists so they're ready after unlock. */
  renderAll();
})();
