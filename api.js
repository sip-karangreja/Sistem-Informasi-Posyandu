/*
 * SPA FRONTEND - SISTEM INFORMASI POSYANDU
 * Backend: Google Apps Script
 *
 * API_URL wajib diganti dengan URL Web App Apps Script Anda.
 */

const API_URL = "https://script.google.com/macros/s/AKfycbxyz123_ganti_ini/exec";

const SESSION_KEY = "posyandu_session";
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;

let chartGender = null;
let chartBpjs = null;
let chartGizi = null;
let chartAge = null;
let chartBB = null;
let chartTB = null;

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

document.addEventListener("DOMContentLoaded", init);

function init() {
  bindEvents();
  checkSessionAndRoute();
}

function bindEvents() {
  $("#login-form")?.addEventListener("submit", handleLogin);
  $("#toggle-password")?.addEventListener("click", togglePassword);
  $("#dashboard-search-form")?.addEventListener("submit", handleDashboardSearch);
  $("#participant-search-form")?.addEventListener("submit", handleParticipantSearch);
  $("#logout-button")?.addEventListener("click", logout);
  $("#mobile-menu")?.addEventListener("click", () => toggleSidebar(true));
  $("#mobile-backdrop")?.addEventListener("click", () => toggleSidebar(false));

  $("#username")?.addEventListener("input", clearLoginError);
  $("#password")?.addEventListener("input", clearLoginError);

  $$(".nav-item[data-route]").forEach(btn => {
    btn.addEventListener("click", () => {
      navigate(btn.dataset.route);
      toggleSidebar(false);
    });
  });

  window.addEventListener("hashchange", routeFromHash);
  window.addEventListener("popstate", routeFromHash);

  $("#participant-search")?.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleParticipantSearch(e);
    }
  });
}

function checkSessionAndRoute() {
  const session = getSession();

  if (!session) {
    showLogin();
    return;
  }

  showApp();
  routeFromHash();
}

function getSession() {
  const raw = localStorage.getItem(SESSION_KEY) || sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;

  try {
    const session = JSON.parse(raw);
    if (!session.timestamp || Date.now() - session.timestamp >= SESSION_MAX_AGE) {
      clearSession();
      return null;
    }
    return session;
  } catch {
    clearSession();
    return null;
  }
}

function saveSession(user, remember) {
  const data = JSON.stringify({
    username: user.username,
    nama: user.nama_lengkap,
    role: user.role,
    timestamp: Date.now()
  });

  clearSession();

  if (remember) localStorage.setItem(SESSION_KEY, data);
  else sessionStorage.setItem(SESSION_KEY, data);
}

function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  sessionStorage.removeItem(SESSION_KEY);
}

function updateUserUI() {
  const session = getSession();
  if (!session) return;

  $$(".user-name-display").forEach(el => el.textContent = session.nama || "Petugas Posyandu");
  $$(".user-role-display").forEach(el => el.textContent = session.role || "Kader");
}

function showLogin() {
  $("#view-login")?.classList.remove("hidden");
  $("#app-shell")?.classList.add("hidden");
  document.body.classList.remove("app-body");
}

function showApp() {
  $("#view-login")?.classList.add("hidden");
  $("#app-shell")?.classList.remove("hidden");
  document.body.classList.add("app-body");
  updateUserUI();
}

function routeFromHash() {
  if (!getSession()) {
    showLogin();
    return;
  }

  showApp();

  const rawRoute = (location.hash || "#dashboard").replace("#", "").split("?")[0];
  const route = ["dashboard", "peserta"].includes(rawRoute) ? rawRoute : "dashboard";

  if (rawRoute !== route) {
    history.replaceState(null, "", "#dashboard");
  }

  showPage(route);

  if (route === "dashboard") {
    fetchDashboardData();
  } else if (route === "peserta") {
    loadParticipantFromUrl();
  }
}

function navigate(route, params = {}) {
  const query = new URLSearchParams(params).toString();
  location.hash = `#${route}${query ? "?" + query : ""}`;
}

function showPage(route) {
  $("#page-dashboard")?.classList.toggle("hidden", route !== "dashboard");
  $("#page-peserta")?.classList.toggle("hidden", route !== "peserta");

  $$(".nav-item[data-route]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.route === route);
  });

  if (route === "dashboard") {
    $("#page-title").textContent = "Dashboard Ringkasan";
    $("#page-subtitle").textContent = "Ringkasan data Posyandu";
  } else {
    $("#page-title").textContent = "Data Peserta";
    $("#page-subtitle").textContent = "Profil dan riwayat kesehatan peserta";
  }

  window.scrollTo({ top: 0, behavior: "smooth" });
}

async function handleLogin(event) {
  event.preventDefault();

  const username = $("#username")?.value.trim();
  const password = $("#password")?.value || "";
  const remember = $("#remember")?.checked;

  if (!username || !password) {
    showLoginError("Username dan kata sandi harus diisi.");
    return;
  }

  if (isApiUnconfigured()) {
    showLoginError("API_URL belum dikonfigurasi. Isi URL Web App Apps Script pada app.js.");
    return;
  }

  showLoading(true, "Memverifikasi akun...");

  try {
    const result = await api("login", { username, password });

    if (result.status !== "success") {
      throw new Error(result.message || "Username atau kata sandi salah.");
    }

    saveSession(result.user, remember);
    showToast("Login berhasil.", "success");
    navigate("dashboard");
  } catch (error) {
    showLoginError(error.message || "Gagal menghubungi server.");
  } finally {
    showLoading(false);
  }
}

function logout() {
  clearSession();
  destroyCharts();
  location.hash = "";
  showLogin();
  $("#login-form")?.reset();
  showToast("Anda telah keluar dari sistem.", "success");
}

function togglePassword() {
  const input = $("#password");
  const icon = $("#eye-icon");
  if (!input || !icon) return;

  const visible = input.type === "text";
  input.type = visible ? "password" : "text";
  icon.className = visible ? "fa-regular fa-eye" : "fa-regular fa-eye-slash";
}

function clearLoginError() {
  $("#login-error")?.classList.add("hidden");
}

function showLoginError(message) {
  const box = $("#login-error");
  if (!box) return;
  box.textContent = message;
  box.classList.remove("hidden");
}

async function fetchDashboardData() {
  if (isApiUnconfigured()) {
    renderDemoDashboard();
    return;
  }

  showLoading(true, "Memuat statistik Dashboard...");

  try {
    const result = await api("getDashboard");

    if (result.status !== "success") {
      throw new Error(result.message || "Data dashboard tidak tersedia.");
    }

    renderDashboard(result.data || {});
  } catch (error) {
    console.warn("Dashboard API error:", error);
    renderDemoDashboard();
    showToast("API dashboard tidak dapat diakses. Data demo ditampilkan.", "error");
  } finally {
    showLoading(false);
  }
}

function renderDashboard(data) {
  $("#stat-total").textContent = formatNumber(data["Total Peserta"] || 0);

  const laki = toNumber(data["Laki-Laki"]);
  const perempuan = toNumber(data["Perempuan"]);
  const bpjs = toNumber(data["BPJS Aktif"]);

  createDonut("genderChart", [laki, perempuan], ["#3b82f6", "#ef4444"], ["Laki-Laki", "Perempuan"], "gender");
  createDonut("bpjsChart", [bpjs, Math.max(laki + perempuan - bpjs, 0)], ["#10b981", "#9ca3af"], ["Memiliki BPJS", "Tidak Memiliki"], "bpjs");

  const giziValues = [
    toNumber(data["Gizi Normal"] ?? 45),
    toNumber(data["Stunting"] ?? 10),
    toNumber(data["Gizi Kurang"] ?? 5),
    toNumber(data["Gizi Buruk"] ?? 2)
  ];
  createDonut("giziChart", giziValues, ["#10b981", "#f59e0b", "#ef4444", "#9ca3af"], ["Normal", "Stunting", "Gizi Kurang", "Buruk"], "gizi");

  const ageLabels = ["0-1 Thn", "2-5 Thn", "6-12 Thn", "13-18 Thn", "19-59 Thn", ">60 Thn"];
  const ageValues = [
    toNumber(data["0-1 Thn"] ?? 48),
    toNumber(data["2-5 Thn"] ?? 62),
    toNumber(data["6-12 Thn"] ?? 74),
    toNumber(data["13-18 Thn"] ?? 68),
    toNumber(data["19-59 Thn"] ?? 45),
    toNumber(data[">60 Thn"] ?? 27)
  ];
  createBar("ageChart", ageLabels, ageValues);
}

function renderDemoDashboard() {
  renderDashboard({
    "Total Peserta": 324,
    "Laki-Laki": 156,
    "Perempuan": 168,
    "BPJS Aktif": 248
  });
}

function createDonut(canvasId, values, colors, labels, key) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === "undefined") return;

  const old = { gender: chartGender, bpjs: chartBpjs, gizi: chartGizi }[key];
  if (old) old.destroy();

  const chart = new Chart(canvas.getContext("2d"), {
    type: "doughnut",
    data: { labels, datasets: [{ data: values, backgroundColor: colors, borderWidth: 0, hoverOffset: 4 }] },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      cutout: "70%",
      plugins: { legend: { position: "right", labels: { boxWidth: 10, font: { size: 9 } } } }
    }
  });

  if (key === "gender") chartGender = chart;
  if (key === "bpjs") chartBpjs = chart;
  if (key === "gizi") chartGizi = chart;
}

function createBar(canvasId, labels, values) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || typeof Chart === "undefined") return;

  if (chartAge) chartAge.destroy();

  chartAge = new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [{
        label: "Jumlah Orang",
        data: values,
        backgroundColor: ["#10b981", "#3b82f6", "#f59e0b", "#8b5cf6", "#f43f5e", "#06b6d4"],
        borderRadius: 5
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        y: { beginAtZero: true, grid: { color: "#e5e7eb" } },
        x: { grid: { display: false } }
      }
    }
  });
}

async function handleDashboardSearch(event) {
  event.preventDefault();
  const query = $("#dashboard-search")?.value.trim();
  if (!query) {
    showToast("Masukkan NIK atau nama peserta.", "error");
    return;
  }
  navigate("peserta", { q: query });
}

async function handleParticipantSearch(event) {
  event.preventDefault();
  const query = $("#participant-search")?.value.trim();
  if (!query) {
    showParticipantAlert("Masukkan NIK atau nama peserta.", "error");
    return;
  }
  await searchParticipant(query);
}

async function loadParticipantFromUrl() {
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  const query = params.get("q");

  if (query) {
    $("#participant-search").value = query;
    await searchParticipant(query);
  } else {
    showParticipantEmpty();
  }
}

async function searchParticipant(query) {
  $("#participant-search").value = query;
  showLoading(true, "Mencari data peserta...");

  try {
    let result;

    if (isApiUnconfigured()) {
      result = demoParticipantResult(query);
    } else {
      result = await api("searchPeserta", { query });
    }

    if (result.status !== "success" || !Array.isArray(result.data) || result.data.length === 0) {
      throw new Error(`Data dengan NIK/nama "${query}" tidak ditemukan.`);
    }

    const participant = result.data[0];

    renderParticipant(participant);
    await fetchMedicalHistory(participant.NIK);

    history.replaceState(null, "", `#peserta?q=${encodeURIComponent(query)}`);
  } catch (error) {
    showParticipantAlert(error.message || "Gagal mengambil data peserta.", "error");
    showParticipantEmpty();
  } finally {
    showLoading(false);
  }
}

function renderParticipant(p) {
  $("#participant-alert")?.classList.add("hidden");
  $("#participant-empty")?.classList.add("hidden");
  $("#participant-content")?.classList.remove("hidden");

  $("#p_nama").textContent = p.Nama_Peserta || "-";
  $("#p_nik").textContent = p.NIK || "-";
  $("#p_kk").textContent = p.No_KK || "-";
  $("#p_ttl").textContent = formatBirthDate(p.Tanggal_Lahir);
  $("#p_jk").textContent = p.Jenis_Kelamin || "-";
  $("#p_alamat").textContent = `Dusun ${p.Dusun || "-"} RT ${p.RT || "-"}/RW ${p.RW || "-"}`;
  $("#p_bpjs").textContent = p.BPJS_Kesehatan || "Tidak Terdaftar";
}

async function fetchMedicalHistory(nik) {
  if (!nik) return;

  try {
    const result = isApiUnconfigured()
      ? demoHistoryResult()
      : await api("getRiwayat", { nik });

    if (result.status !== "success") {
      throw new Error(result.message || "Riwayat medis tidak tersedia.");
    }

    renderMedicalHistory(result.data || []);
  } catch (error) {
    console.warn("Medical history API error:", error);
    renderMedicalHistory([]);
    showParticipantAlert("Profil ditemukan, tetapi riwayat medis tidak dapat dimuat.", "warning");
  }
}

function renderMedicalHistory(data) {
  const rows = Array.isArray(data) ? [...data] : [];
  rows.reverse();

  const labels = [];
  const weights = [];
  const heights = [];

  let latestTensi = "-";
  let latestGula = "-";
  let latestKolesterol = "-";
  let latestVisit = "-";

  let logHtml = "";

  rows.forEach((r, index) => {
    const label = getVisitLabel(r, index);
    labels.push(label);
    weights.push(toNumber(r.Berat_Badan_Kg));
    heights.push(toNumber(r.Tinggi_Badan_Cm));

    latestTensi = r.Tensi_Darah || latestTensi;
    latestGula = r.Gula_Darah || r.Gula_Darah_mgdL || latestGula;
    latestKolesterol = r.Kolesterol || latestKolesterol;
    latestVisit = label;

    logHtml += `
      <div class="log-item">
        <span class="log-dot"></span>
        <div class="log-head">
          <span class="log-date">${escapeHtml(label)}</span>
          <span class="log-petugas">Petugas: Kader Posyandu</span>
        </div>
        <p class="log-description">
          Berat badan ${escapeHtml(r.Berat_Badan_Kg ?? "-")} kg,
          tinggi badan ${escapeHtml(r.Tinggi_Badan_Cm ?? "-")} cm.
          Tensi ${escapeHtml(r.Tensi_Darah ?? "-")} mmHg.
          Gula darah ${escapeHtml(r.Gula_Darah_mgdL ?? r.Gula_Darah ?? "-")} mg/dL.
        </p>
        <div class="log-note"><b>Catatan:</b> ${escapeHtml(r.Catatan_Kader || "Tidak ada keluhan khusus.")}</div>
      </div>`;
  });

  $("#logCatatan").innerHTML = logHtml || `<p class="empty-log">Belum ada riwayat rekam medis.</p>`;
  $("#p_last_visit").textContent = latestVisit;

  $("#vitalCards").innerHTML = `
    <div class="vital-card red">
      <div class="vital-label"><i class="fa-solid fa-heart-pulse"></i> Tensi Darah</div>
      <div class="vital-value">${escapeHtml(latestTensi)} <small>mmHg</small></div>
    </div>
    <div class="vital-card purple">
      <div class="vital-label"><i class="fa-solid fa-droplet"></i> Gula Darah</div>
      <div class="vital-value">${escapeHtml(latestGula)} <small>mg/dL</small></div>
    </div>
    <div class="vital-card orange">
      <div class="vital-label"><i class="fa-solid fa-vial-circle-check"></i> Kolesterol</div>
      <div class="vital-value">${escapeHtml(latestKolesterol)} <small>mg/dL</small></div>
    </div>`;

  drawHistoryCharts(labels, weights, heights);
}

function drawHistoryCharts(labels, weights, heights) {
  if (typeof Chart === "undefined") return;

  Chart.defaults.font.family = "Inter, sans-serif";

  if (chartBB) chartBB.destroy();
  if (chartTB) chartTB.destroy();

  const bbCanvas = $("#chartBB");
  const tbCanvas = $("#chartTB");

  if (bbCanvas) {
    chartBB = new Chart(bbCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [{
          data: weights,
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,.10)",
          borderWidth: 2,
          tension: .35,
          fill: true,
          pointBackgroundColor: "#22c55e",
          pointRadius: 4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }

  if (tbCanvas) {
    chartTB = new Chart(tbCanvas.getContext("2d"), {
      type: "line",
      data: {
        labels,
        datasets: [{
          data: heights,
          borderColor: "#3b82f6",
          backgroundColor: "rgba(59,130,246,.10)",
          borderWidth: 2,
          tension: .35,
          fill: true,
          pointBackgroundColor: "#3b82f6",
          pointRadius: 4
        }]
      },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } } }
    });
  }
}

function showParticipantEmpty() {
  $("#participant-content")?.classList.add("hidden");
  $("#participant-empty")?.classList.remove("hidden");
  $("#participant-alert")?.classList.add("hidden");
}

function showParticipantAlert(message, type = "info") {
  const box = $("#participant-alert");
  if (!box) return;

  box.textContent = message;
  box.className = `alert ${type === "error" ? "error" : type === "warning" ? "warning" : ""}`;
  box.classList.remove("hidden");
}

function showLoading(show, text = "Memuat data...") {
  const overlay = $("#loading-overlay");
  if (!overlay) return;

  $("#loading-text").textContent = text;
  overlay.classList.toggle("hidden", !show);
}

function showToast(message, type = "") {
  const container = $("#toast-container");
  if (!container) return;

  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.textContent = message;
  container.appendChild(toast);

  setTimeout(() => toast.remove(), 3500);
}

function toggleSidebar(open) {
  $("#sidebar")?.classList.toggle("open", open);
  $("#mobile-backdrop")?.classList.toggle("hidden", !open);
}

async function api(action, params = {}) {
  if (isApiUnconfigured()) {
    throw new Error("API_URL belum dikonfigurasi.");
  }

  const query = new URLSearchParams({ action, ...params });
  const response = await fetch(`${API_URL}?${query.toString()}`, {
    method: "GET",
    cache: "no-store"
  });

  if (!response.ok) {
    throw new Error(`HTTP ${response.status}`);
  }

  return await response.json();
}

function isApiUnconfigured() {
  return !API_URL || API_URL.includes("ganti_ini");
}

function formatBirthDate(value) {
  if (!value || value === "-") return "-";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return String(value);

  const age = new Date().getFullYear() - date.getFullYear();
  return `${String(value)} (${Math.max(0, age)} tahun)`;
}

function getVisitLabel(record, index) {
  if (record?.Timestamp) return String(record.Timestamp).split(" ")[0] || String(record.Timestamp);
  return `Kunjungan ${index + 1}`;
}

function toNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatNumber(value) {
  return new Intl.NumberFormat("id-ID").format(toNumber(value));
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function destroyCharts() {
  [chartGender, chartBpjs, chartGizi, chartAge, chartBB, chartTB].forEach(chart => {
    if (chart) chart.destroy();
  });
  chartGender = chartBpjs = chartGizi = chartAge = chartBB = chartTB = null;
}

/*
 * Mode demo hanya digunakan untuk preview ketika API_URL belum diisi.
 * Setelah API_URL diisi, data berasal dari Google Apps Script.
 */
function demoParticipantResult(query) {
  return {
    status: "success",
    data: [{
      NIK: query,
      No_KK: "3201010101234567",
      Nama_Peserta: "Siti Nurhaliza (Data Demo)",
      Tanggal_Lahir: "2004-08-12",
      Jenis_Kelamin: "Perempuan",
      Dusun: "Krajan",
      RT: "02",
      RW: "01",
      BPJS_Kesehatan: "Memiliki BPJS"
    }]
  };
}

function demoHistoryResult() {
  return {
    status: "success",
    data: [
      { Timestamp: "12 Agu 2025", Berat_Badan_Kg: 52, Tinggi_Badan_Cm: 158, Tensi_Darah: "120/80", Gula_Darah_mgdL: 95, Kolesterol: 180, Catatan_Kader: "Kondisi umum sangat baik. Tidak ada keluhan." },
      { Timestamp: "15 Jul 2025", Berat_Badan_Kg: 53, Tinggi_Badan_Cm: 158, Tensi_Darah: "118/78", Gula_Darah_mgdL: 92, Kolesterol: 185, Catatan_Kader: "Diberikan vitamin dan edukasi gizi seimbang." },
      { Timestamp: "10 Jun 2025", Berat_Badan_Kg: 50, Tinggi_Badan_Cm: 158, Tensi_Darah: "120/80", Gula_Darah_mgdL: 90, Kolesterol: 175, Catatan_Kader: "Kondisi baik. Anjuran tetap mengonsumsi makanan bergizi." }
    ]
  };
}
