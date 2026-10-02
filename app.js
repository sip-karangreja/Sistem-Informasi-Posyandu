// GANTI DENGAN URL DEPLOYMENT APPS SCRIPT ANDA NANTINYA
const API_URL = 'https://script.google.com/macros/s/GANTI_DENGAN_ID_DEPLOY_ANDA/exec'; 

// ==========================================
// 1. LOGIKA LOGIN & LOGOUT
// ==========================================
async function prosesLogin(e) {
    e.preventDefault();
    const btn = document.getElementById('btnLogin');
    const user = document.getElementById('username').value;
    const pass = document.getElementById('password').value;
    
    btn.innerText = "Memeriksa...";
    btn.disabled = true;

    // Simulasi loading API Auth
    await new Promise(r => setTimeout(r, 1000));

    if (user === 'admin' || user === 'kader') {
        // Berhasil Login: Sembunyikan form login, tampilkan dashboard
        document.getElementById('loginSection').classList.add('hidden');
        document.getElementById('dashboardSection').classList.remove('hidden');
    } else {
        await tampilkanAlert("Login Gagal", "Username atau password tidak ditemukan. Coba ketik 'admin' atau 'kader'.", "info");
    }

    btn.innerText = "LOGIN MASUK";
    btn.disabled = false;
}

function prosesLogout() {
    document.getElementById('dashboardSection').classList.add('hidden');
    document.getElementById('loginSection').classList.remove('hidden');
    document.getElementById('loginForm').reset();
    document.getElementById('contentArea').innerHTML = `
        <div class="empty-state">
            <h3>Selamat Datang!</h3>
            <p>Silakan cari data peserta menggunakan nama atau NIK di atas.</p>
        </div>`;
    document.getElementById('searchInput').value = "";
}

// ==========================================
// 2. CUSTOM ALERT SYSTEM (Promise Based)
// ==========================================
function tampilkanAlert(judul, pesan, tipe = 'info') {
    return new Promise((resolve) => {
        const alertUI = document.getElementById('customAlert');
        const btnCancel = document.getElementById('alertBtnCancel');
        const btnConfirm = document.getElementById('alertBtnConfirm');

        document.getElementById('alertTitle').innerText = judul;
        document.getElementById('alertMsg').innerText = pesan;

        if (tipe === 'confirm') {
            btnCancel.classList.remove('hidden');
            btnConfirm.innerText = "Ya, Lanjutkan";
            btnConfirm.style.background = "#198754"; 
        } else {
            btnCancel.classList.add('hidden');
            btnConfirm.innerText = "OK Mengerti";
            btnConfirm.style.background = "#0d6efd"; 
        }

        alertUI.classList.remove('hidden');
        btnCancel.onclick = () => { alertUI.classList.add('hidden'); resolve(false); };
        btnConfirm.onclick = () => { alertUI.classList.add('hidden'); resolve(true); };
    });
}

// ==========================================
// 3. LOGIKA PENCARIAN & MODAL REKAM MEDIS
// ==========================================
async function cariData() {
    const keyword = document.getElementById('searchInput').value;
    const content = document.getElementById('contentArea');
    const loading = document.getElementById('loading');

    if (!keyword) {
        await tampilkanAlert("Peringatan", "Harap masukkan NIK atau Nama Peserta!", "info");
        return;
    }

    content.innerHTML = '';
    loading.classList.remove('hidden');

    // MOCK DATA BERDASARKAN DOKUMEN POSYANDU KARANGREJA
    await new Promise(r => setTimeout(r, 800));
    
    // Data dummy menggunakan NIK & Nama asli dari data source form responses 1
    const dummyData = [
        { NIK: "3173024201620004", NAMA_PESERTA: "ABYAN HARIS MAULANA", KATEGORI_USIA: "Balita", USIA: 4, NAMA_IBU: "Ibu Abyan", NAMA_KK: "Bapak Abyan", DUSUN: "Krajan", RT: "01", RW: "02" },
        { NIK: "3301076005720001", NAMA_PESERTA: "SITI AMINAH", KATEGORI_USIA: "Dewasa", USIA: 35, NAMA_IBU: "-", NAMA_KK: "Bapak Siti", DUSUN: "Kampung Baru", RT: "03", RW: "01" }
    ];

    const results = dummyData.filter(p => p.NAMA_PESERTA.toLowerCase().includes(keyword.toLowerCase()) || p.NIK.includes(keyword));
    
    loading.classList.add('hidden');

    if (results.length > 0) {
        renderProfil(results[0]); 
    } else {
        content.innerHTML = '<div class="empty-state">Data peserta tidak ditemukan. Pastikan ejaan nama atau NIK sudah benar.</div>';
    }
}

function renderProfil(data) {
    const labelUsia = data.KATEGORI_USIA === 'Balita' ? `${data.USIA} Tahun (Balita)` : `${data.USIA} Tahun`;
    document.getElementById('contentArea').innerHTML = `
        <div class="profile-card">
            <div class="profil-header">
                <h2>${data.NAMA_PESERTA}</h2>
                <div class="profil-info">
                    <p><strong>NIK:</strong> ${data.NIK}</p>
                    <p><strong>Nama KK:</strong> ${data.NAMA_KK}</p>
                    <p><strong>Usia:</strong> ${labelUsia} | <strong>Nama Ibu:</strong> ${data.NAMA_IBU}</p>
                    <p><strong>Alamat:</strong> Dusun ${data.DUSUN} RT ${data.RT}/RW ${data.RW}</p>
                </div>
            </div>
            <button class="btn-tambah" onclick="bukaModal('${data.NIK}', '${data.NAMA_PESERTA}', '${data.KATEGORI_USIA}', '${data.NAMA_IBU}')">
                + Input Rekam Medis Bulan Ini
            </button>
        </div>
    `;
}

function bukaModal(nik, nama, kategori, namaIbu) {
    document.getElementById('modalTitle').innerText = `Rekam Medis: ${nama}`;
    document.getElementById('formNik').value = nik;
    document.getElementById('formKategori').value = kategori;
    
    if (kategori === 'Balita') {
        document.getElementById('groupNamaIbu').classList.remove('hidden');
        document.getElementById('namaIbu').required = true;
        document.getElementById('namaIbu').value = (namaIbu && namaIbu !== '-') ? namaIbu : '';
        document.getElementById('fieldPTM').classList.add('hidden'); 
    } else {
        document.getElementById('groupNamaIbu').classList.add('hidden');
        document.getElementById('namaIbu').required = false;
        document.getElementById('fieldPTM').classList.remove('hidden'); 
    }
    
    document.getElementById('modalRekamMedis').classList.remove('hidden');
}

function tutupModal() {
    document.getElementById('modalRekamMedis').classList.add('hidden');
    document.getElementById('formRM').reset();
}

async function tanganiSimpanData(e) {
    e.preventDefault();
    const konfirmasi = await tampilkanAlert("Konfirmasi Simpan", "Apakah Anda yakin data kesehatan yang diinput sudah benar?", "confirm");
    
    if (!konfirmasi) return;

    const btn = document.getElementById('btnSubmitRM');
    btn.innerText = 'Menyimpan Data...';
    btn.disabled = true;

    // Proses penyimpanan (Simulasi)
    await new Promise(r => setTimeout(r, 1200));
        
    tutupModal();
    await tampilkanAlert("Berhasil", "Data rekam medis berhasil disimpan!", "info");
    
    btn.innerText = 'Simpan Rekam Medis';
    btn.disabled = false;
}
