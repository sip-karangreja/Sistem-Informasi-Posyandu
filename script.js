// ==============================================================
// Konfigurasi API Apps Script
// PENTING: Ganti dengan Web App URL Anda yang valid
// ==============================================================
const API_URL = "https://script.google.com/macros/s/AKfycbxyz123_ganti_ini/exec"; 
// ==============================================================

function showLoading(show) {
    const overlay = document.getElementById('loading-overlay');
    if (overlay) {
        overlay.style.display = show ? 'flex' : 'none';
    }
}

// Check session on load
document.addEventListener('DOMContentLoaded', () => {
    const savedSession = localStorage.getItem('posyandu_session') || sessionStorage.getItem('posyandu_session');
    
    const isLoginPage = window.location.pathname.endsWith('index.html') || window.location.pathname === '/';
    
    if (savedSession) {
        try {
            const parsed = JSON.parse(savedSession);
            const oneDay = 24 * 60 * 60 * 1000;
            if (new Date().getTime() - parsed.timestamp < oneDay) {
                // Valid session
                updateUserUI(parsed);
                if (isLoginPage) {
                    window.location.href = "dashboard.html";
                }
            } else {
                // Expired session
                clearSession();
                if (!isLoginPage) {
                     window.location.href = "index.html";
                }
            }
        } catch(e) {
            console.error("Error parsing session");
            clearSession();
            if (!isLoginPage) window.location.href = "index.html";
        }
    } else if (!isLoginPage) {
        // No session, redirect to login if not already there
        // Comment out for demo purposes
        // window.location.href = "index.html";
    }
});

function clearSession() {
    localStorage.removeItem('posyandu_session');
    sessionStorage.removeItem('posyandu_session');
}

function updateUserUI(user) {
    const userNames = document.querySelectorAll('.user-name-display');
    const userRoles = document.querySelectorAll('.user-role-display');
    
    userNames.forEach(el => el.textContent = user.nama);
    userRoles.forEach(el => el.textContent = user.role);
}

function togglePassword() {
    const pwdInput = document.getElementById('password');
    const eyeIcon = document.getElementById('eyeIcon');
    
    if (pwdInput && eyeIcon) {
        if (pwdInput.type === 'password') {
            pwdInput.type = 'text';
            eyeIcon.classList.remove('fa-eye');
            eyeIcon.classList.add('fa-eye-slash');
        } else {
            pwdInput.type = 'password';
            eyeIcon.classList.remove('fa-eye-slash');
            eyeIcon.classList.add('fa-eye');
        }
    }
}

function showError(message) {
    const errorDiv = document.getElementById('errorMessage');
    const errorText = document.getElementById('errorText');
    if (errorDiv && errorText) {
        errorText.innerText = message;
        errorDiv.classList.remove('hidden');
    }
}

async function handleLogin(event) {
    event.preventDefault(); 
    
    const usernameInput = document.getElementById('username')?.value.trim();
    const passwordInput = document.getElementById('password')?.value;
    const rememberMe = document.getElementById('remember')?.checked;

    if (!usernameInput || !passwordInput) {
        showError("Username dan Kata Sandi harus diisi.");
        return;
    }

    showLoading(true);

    try {
        const response = await fetch(`${API_URL}?action=login&username=${encodeURIComponent(usernameInput)}&password=${encodeURIComponent(passwordInput)}`);
        
        if (API_URL.includes("ganti_ini")) {
            console.warn("API URL belum dikonfigurasi. Menggunakan Mode Demo Login.");
            simulateDemoLogin(usernameInput, passwordInput, rememberMe);
            return;
        }

        const result = await response.json();

        if (result.status === 'success') {
            simpanSesiLokal(result.user, rememberMe);
            window.location.href = "dashboard.html";
        } else {
            showError(result.message || "Username atau kata sandi tidak valid.");
        }

    } catch (error) {
        console.error("Login Error:", error);
        if (API_URL.includes("ganti_ini")) {
            simulateDemoLogin(usernameInput, passwordInput, rememberMe);
        } else {
            showError("Gagal terhubung ke server database. Periksa koneksi internet Anda.");
        }
    } finally {
        showLoading(false);
    }
}

function simpanSesiLokal(userData, remember) {
    const sessionData = JSON.stringify({
        username: userData.username,
        nama: userData.nama_lengkap,
        role: userData.role,
        timestamp: new Date().getTime()
    });

    if (remember) {
        localStorage.setItem('posyandu_session', sessionData);
    } else {
        sessionStorage.setItem('posyandu_session', sessionData);
    }
}

function simulateDemoLogin(user, pass, remember) {
    setTimeout(() => {
        showLoading(false);
        
        const demoUsers = {
            'kader_sulastri': { password: '*enkripsi_1*', nama_lengkap: 'Ibu Sulastri', role: 'Kader' },
            'admin_posyandu': { password: '*enkripsi_2*', nama_lengkap: 'Admin Utama', role: 'Admin' }
        };

        const foundUser = demoUsers[user];

        // For demo, accept any password for sulastri if *enkripsi_1* is expected, or accept the actual demo password
        if (foundUser && (foundUser.password === pass || (user === 'kader_sulastri' && pass === '123'))) {
            const userDataToStore = {
                username: user,
                nama_lengkap: foundUser.nama_lengkap,
                role: foundUser.role
            };
            
            simpanSesiLokal(userDataToStore, remember);
            window.location.href = "dashboard.html"; 
        } else {
            showError("DEMO: Username/Password salah. Coba: kader_sulastri / 123");
        }
    }, 1000);
}

// Clear errors on input
document.getElementById('username')?.addEventListener('input', () => {
    document.getElementById('errorMessage')?.classList.add('hidden');
});
document.getElementById('password')?.addEventListener('input', () => {
    document.getElementById('errorMessage')?.classList.add('hidden');
});


if (window.location.pathname.endsWith('dashboard.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        fetchDashboardData();
    });
}

async function fetchDashboardData() {
    showLoading(true);
    try {
        const response = await fetch(`${API_URL}?action=getDashboard`);
        const result = await response.json();
        
        if (result.status === 'success') {
            renderDashboard(result.data);
        } else {
            throw new Error("Format respon tidak sesuai.");
        }
    } catch (error) {
        console.warn("API Error / Not Configured. Menggunakan Demo Data.", error);
        renderDemoDashboard();
    } finally {
        showLoading(false);
    }
}

function renderDashboard(data) {
    const statTotal = document.getElementById('stat-total');
    if(statTotal) statTotal.innerText = data['Total Peserta'] || 0;

    const laki = parseInt(data['Laki-Laki']) || 0;
    const perempuan = parseInt(data['Perempuan']) || 0;
    createDonutChart('genderChart', [laki, perempuan], ['#3b82f6', '#ef4444'], ['Laki-Laki', 'Perempuan']);

    const bpjsAktif = parseInt(data['BPJS Aktif']) || 0;
    const total = laki + perempuan;
    const nonBpjs = total - bpjsAktif > 0 ? total - bpjsAktif : 0;
    createDonutChart('bpjsChart', [bpjsAktif, nonBpjs], ['#10b981', '#9ca3af'], ['Memiliki BPJS', 'Tidak Memiliki']);

    createDonutChart('giziChart', [45, 10, 5, 2], ['#10b981', '#f59e0b', '#ef4444', '#9ca3af'], ['Normal', 'Stunting', 'Gizi Kurang', 'Buruk']);

    createBarChart('ageChart', 
        ['0-1 Thn', '2-5 Thn', '6-12 Thn', '13-18 Thn', '19-59 Thn', '>60 Thn'], 
        [48, 62, 74, 68, 45, 27]
    );
}

function createDonutChart(canvasId, dataArray, colors, labels) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: dataArray,
                backgroundColor: colors,
                borderWidth: 0,
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: '70%',
            plugins: {
                legend: { position: 'right', labels: { boxWidth: 12, font: { size: 10 } } }
            }
        }
    });
}

function createBarChart(canvasId, labels, dataArray) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Jumlah Orang',
                data: dataArray,
                backgroundColor: ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#f43f5e', '#06b6d4'],
                borderRadius: 4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false } },
            scales: {
                y: { beginAtZero: true, grid: { borderDash: [2, 4], color: '#e5e7eb' } },
                x: { grid: { display: false } }
            }
        }
    });
}

function renderDemoDashboard() {
    renderDashboard({
        'Total Peserta': 324,
        'Laki-Laki': 156,
        'Perempuan': 168,
        'BPJS Aktif': 248
    });
}

let chartInstanceBB = null;
let chartInstanceTB = null;

if (window.location.pathname.endsWith('profil.html')) {
    document.addEventListener('DOMContentLoaded', () => {
        const urlParams = new URLSearchParams(window.location.search);
        const queryNIK = urlParams.get('q');
        
        const searchInput = document.getElementById('searchInput');
        if (queryNIK && searchInput) {
            searchInput.value = queryNIK;
            cariPeserta(queryNIK);
        } else {
            const alertBox = document.getElementById('alertBox');
            if (alertBox) {
                alertBox.classList.remove('hidden');
                document.getElementById('alertMessage').innerText = "Silakan masukkan NIK atau cari dari halaman Dashboard.";
            }
        }

        searchInput?.addEventListener("keypress", function(event) {
          if (event.key === "Enter") {
            event.preventDefault();
            cariPeserta();
          }
        });
    });
}

async function cariPeserta(nikQuery = null) {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    const input = nikQuery || searchInput.value.trim();
    if(!input) return alert('Masukkan NIK peserta!');

    const newUrl = new URL(window.location);
    newUrl.searchParams.set('q', input);
    window.history.pushState({path: newUrl.href}, '', newUrl.href);

    showLoading(true);
    try {
        const response = await fetch(`${API_URL}?action=searchPeserta&query=${encodeURIComponent(input)}`);
        const result = await response.json();
        
        if(result.status === 'success' && result.data.length > 0) {
            const pasien = result.data[0]; 
            tampilkanProfil(pasien);
            await ambilRiwayat(pasien.NIK);
        } else {
            tampilkanAlert(`Data dengan NIK/Nama "${input}" tidak ditemukan.`, 'red');
            sembunyikanKonten();
        }
    } catch (error) {
        console.error("Gagal koneksi API:", error);
        
        if(API_URL.includes("ganti_ini")) {
            console.warn("MENGGUNAKAN DATA DEMO (API Belum Diset)");
            demoModeRender(input);
        } else {
            tampilkanAlert('Gagal terhubung ke database server.', 'red');
        }
    } finally {
        showLoading(false);
    }
}

function tampilkanProfil(p) {
    document.getElementById('alertBox')?.classList.add('hidden');
    document.getElementById('profilContainer')?.classList.remove('hidden');
    document.getElementById('tabContainer')?.classList.remove('hidden');
    document.getElementById('historiContainer')?.classList.remove('hidden');

    const pNama = document.getElementById('p_nama');
    if (pNama) pNama.innerHTML = `${p.Nama_Peserta || '-'} <i class="fa-solid fa-circle-check text-blue-500 text-lg"></i>`;
    
    setInnerText('p_nik', p.NIK);
    setInnerText('p_kk', p.No_KK);
    
    let textLahir = p.Tanggal_Lahir || '-';
    if(p.Tanggal_Lahir && p.Tanggal_Lahir !== '-') {
        try {
            let d = new Date(p.Tanggal_Lahir);
            let diffYear = new Date().getFullYear() - d.getFullYear();
            textLahir = `${p.Tanggal_Lahir} (${diffYear} tahun)`;
        } catch(e){}
    }
    
    setInnerText('p_ttl', textLahir);
    setInnerText('p_jk', p.Jenis_Kelamin);
    setInnerText('p_alamat', `Dusun ${p.Dusun || '-'} RT ${p.RT || '-'}/RW ${p.RW || '-'}`);
    setInnerText('p_bpjs', p.BPJS_Kesehatan || 'Tidak Terdaftar');
}

function setInnerText(id, text) {
    const el = document.getElementById(id);
    if (el) el.innerText = text || '-';
}

async function ambilRiwayat(nik) {
    try {
        const response = await fetch(`${API_URL}?action=getRiwayat&nik=${nik}`);
        const result = await response.json();
        if(result.status === 'success') {
            renderGrafikDanLog(result.data);
        }
    } catch (error) {
        console.error("Gagal mengambil riwayat:", error);
    }
}

function renderGrafikDanLog(riwayatData) {
    if (!riwayatData) return;
    riwayatData.reverse(); 

    const labels = [];
    const dataBB = [];
    const dataTB = [];
    
    let htmlLog = "";
    let latestTensi = "-";
    let latestGula = "-";
    let latestKolesterol = "-";
    let latestVisitDate = "-";

    riwayatData.forEach((r, index) => {
        let labelBulan = `Okt ${2025 + index}`; 
        if(r.Timestamp) {
            labelBulan = r.Timestamp.split(' ')[0] || r.Timestamp;
        }
        labels.push(labelBulan);
        dataBB.push(r.Berat_Badan_Kg || 0);
        dataTB.push(r.Tinggi_Badan_Cm || 0);

        latestTensi = r.Tensi_Darah || latestTensi;
        latestGula = r.Gula_Darah || r.Gula_Darah_mgdL || latestGula;
        latestKolesterol = r.Kolesterol || latestKolesterol;
        latestVisitDate = labelBulan;

        htmlLog = `
        <div class="relative pl-4 border-l-2 border-gray-200 pb-2">
            <div class="absolute w-3 h-3 bg-blue-500 rounded-full -left-[7px] top-1 border-2 border-white"></div>
            <div class="flex justify-between items-start mb-1">
                <p class="text-sm text-gray-800 font-bold">${labelBulan}</p>
                <p class="text-xs text-gray-400">Petugas: Kader Posyandu</p>
            </div>
            <p class="text-xs text-gray-600 mb-2 leading-relaxed">
                Berat badan ${r.Berat_Badan_Kg} kg, tinggi badan ${r.Tinggi_Badan_Cm} cm. 
                Tensi ${r.Tensi_Darah} mmHg. Gula darah ${r.Gula_Darah_mgdL || r.Gula_Darah || '-'} mg/dL.
            </p>
            <div class="bg-blue-50/50 p-2 rounded-lg border border-blue-100 text-xs text-gray-700">
                <span class="font-semibold text-blue-700">Catatan:</span> ${r.Catatan_Kader || 'Tidak ada keluhan khusus.'}
            </div>
        </div>` + htmlLog;
    });

    const logCatatan = document.getElementById('logCatatan');
    if (logCatatan) logCatatan.innerHTML = htmlLog || "<p class='text-sm text-gray-400 text-center py-4'>Belum ada riwayat rekam medis.</p>";
    
    setInnerText('p_last_visit', latestVisitDate);

    const vitalCards = document.getElementById('vitalCards');
    if (vitalCards) {
        vitalCards.innerHTML = `
            <div class="bg-red-50 p-4 rounded-xl border border-red-100 flex flex-col justify-center items-center text-center">
                <div class="flex items-center gap-2 mb-1"><i class="fa-solid fa-heart-pulse text-red-500"></i> <span class="text-xs font-bold text-gray-600">Tensi Darah</span></div>
                <p class="text-xl font-bold text-red-600">${latestTensi} <span class="text-xs font-normal text-gray-500">mmHg</span></p>
            </div>
            <div class="bg-purple-50 p-4 rounded-xl border border-purple-100 flex flex-col justify-center items-center text-center">
                <div class="flex items-center gap-2 mb-1"><i class="fa-solid fa-droplet text-purple-500"></i> <span class="text-xs font-bold text-gray-600">Gula Darah</span></div>
                <p class="text-xl font-bold text-purple-600">${latestGula} <span class="text-xs font-normal text-gray-500">mg/dL</span></p>
            </div>
            <div class="bg-orange-50 p-4 rounded-xl border border-orange-100 flex flex-col justify-center items-center text-center">
                <div class="flex items-center gap-2 mb-1"><i class="fa-solid fa-vial-circle-check text-orange-500"></i> <span class="text-xs font-bold text-gray-600">Kolesterol</span></div>
                <p class="text-xl font-bold text-orange-600">${latestKolesterol} <span class="text-xs font-normal text-gray-500">mg/dL</span></p>
            </div>
        `;
    }

    gambarGrafik(labels, dataBB, dataTB);
}

function gambarGrafik(labels, dataBB, dataTB) {
    if (typeof Chart === 'undefined') return;
    
    Chart.defaults.font.family = "'Inter', sans-serif";
    
    if(chartInstanceBB) chartInstanceBB.destroy();
    if(chartInstanceTB) chartInstanceTB.destroy();

    const canvasBB = document.getElementById('chartBB');
    if (canvasBB) {
        const ctxBB = canvasBB.getContext('2d');
        chartInstanceBB = new Chart(ctxBB, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: dataBB,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#22c55e',
                    pointRadius: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { border: { dash: [4, 4] }, grid: { color: '#f3f4f6' } } } }
        });
    }

    const canvasTB = document.getElementById('chartTB');
    if (canvasTB) {
        const ctxTB = canvasTB.getContext('2d');
        chartInstanceTB = new Chart(ctxTB, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    data: dataTB,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    pointBackgroundColor: '#3b82f6',
                    pointRadius: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { border: { dash: [4, 4] }, grid: { color: '#f3f4f6' } } } }
        });
    }
}

function tampilkanAlert(msg, color='blue') {
    const box = document.getElementById('alertBox');
    if (box) {
        box.className = `bg-${color}-50 border border-${color}-200 text-${color}-800 p-4 rounded-xl text-sm mb-4 block`;
        document.getElementById('alertMessage').innerText = msg;
    }
    sembunyikanKonten();
}

function sembunyikanKonten() {
    document.getElementById('profilContainer')?.classList.add('hidden');
    document.getElementById('tabContainer')?.classList.add('hidden');
    document.getElementById('historiContainer')?.classList.add('hidden');
}

function demoModeRender(nikRequested) {
    const demoPasien = { NIK: nikRequested, No_KK: "3201010101234567", Nama_Peserta: "Siti Nurhaliza (Demo)", Tanggal_Lahir: "2004-08-12", Jenis_Kelamin: "Perempuan", Dusun: "Krajan", RT: "02", RW: "01", BPJS_Kesehatan: "Memiliki BPJS" };
    const demoRiwayat = [
        { Timestamp: "12 Agu 2025", Berat_Badan_Kg: 52, Tinggi_Badan_Cm: 158, Tensi_Darah: "120/80", Gula_Darah_mgdL: 95, Kolesterol: 180, Catatan_Kader: "Kondisi umum sangat baik. Tidak ada keluhan." },
        { Timestamp: "15 Jul 2025", Berat_Badan_Kg: 53, Tinggi_Badan_Cm: 158, Tensi_Darah: "118/78", Gula_Darah_mgdL: 92, Kolesterol: 185, Catatan_Kader: "Diberikan vitamin dan edukasi gizi seimbang." },
        { Timestamp: "10 Jun 2025", Berat_Badan_Kg: 50, Tinggi_Badan_Cm: 158, Tensi_Darah: "120/80", Gula_Darah_mgdL: 90, Kolesterol: 175, Catatan_Kader: "Kondisi baik. Anjuran tetap mengonsumsi makanan bergizi." }
    ];
    
    tampilkanProfil(demoPasien);
    renderGrafikDanLog(demoRiwayat);
}
