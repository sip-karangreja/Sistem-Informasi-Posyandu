// GANTI DENGAN URL DEPLOYMENT APPS SCRIPT ANDA
const API_URL = 'https://script.google.com/macros/s/GANTI_DENGAN_ID_DEPLOY_ANDA/exec'; 

// ==========================================
// CUSTOM ALERT SYSTEM (Promise Based)
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
// LOGIKA APLIKASI UTAMA
// ==========================================
async function cariData() {
    const keyword = document.getElementById('searchInput').value;
    const content = document.getElementById('contentArea');
    const loading = document.getElementById('loading');

    if (!keyword) {
        await tampilkanAlert("Peringatan", "Harap masukkan kata kunci pencarian!", "info");
        return;
    }

    content.innerHTML = '';
    loading.classList.remove('hidden');

    try {
        const res = await fetch(`${API_URL}?action=search&keyword=${keyword}`);
        const data = await res.json();
        
        loading.classList.add('hidden');

        if (data.data && data.data.length > 0) {
            renderProfil(data.data[0]); 
        } else {
            content.innerHTML = '<div class="empty-state">Data peserta tidak ditemukan.</div>';
        }
    } catch (err) {
        loading.classList.add('hidden');
        content.innerHTML = '<div class="empty-state">Mode Demo Lokal aktif. Hubungkan API untuk data real.</div>';
    }
}

function renderProfil(data) {
    const labelUsia = data['KATEGORI USIA'].toLowerCase() === 'balita' ? `${data.USIA} Tahun (Balita)` : `${data.USIA} Tahun`;
    document.getElementById('contentArea').innerHTML = `
        <div class="profile-card">
            <div class="profil-header">
                <h2>${data['NAMA PESERTA']}</h2>
                <div class="profil-info">
                    <p><strong>NIK:</strong> ${data.NIK}</p>
                    <p><strong>Nama Kepala Keluarga:</strong> ${data['NAMA KEPALA KELUARGA']}</p>
                    <p><strong>Usia:</strong> ${labelUsia} | <strong>Nama Ibu:</strong> ${data['NAMA IBU']}</p>
                    <p><strong>Alamat:</strong> Dusun ${data.DUSUN} RT ${data.RT}/RW ${data.RW}</p>
                    <p><strong>BPJS:</strong> ${data['BPJS KESEHATAN']}</p>
                </div>
            </div>
            <button class="btn-tambah" onclick="bukaModal('${data.NIK}', '${data['NAMA PESERTA']}', '${data['KATEGORI USIA']}', '${data['NAMA IBU']}')">
                + Input Rekam Medis
            </button>
        </div>
    `;
}

function bukaModal(nik, nama, kategori, namaIbu) {
    document.getElementById('modalTitle').innerText = `Rekam Medis: ${nama}`;
    document.getElementById('formNik').value = nik;
    document.getElementById('formKategori').value = kategori;
    
    if (kategori.toLowerCase() === 'balita') {
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
    
    // Panggil Custom Alert (Tipe: confirm / 2 tombol)
    const konfirmasi = await tampilkanAlert("Konfirmasi Simpan", "Apakah Anda yakin data kesehatan yang diinput sudah benar?", "confirm");
    
    if (!konfirmasi) {
        return; // Hentikan fungsi jika user klik "Batal"
    }

    const btn = document.getElementById('btnSubmit');
    btn.innerText = 'Menyimpan...';
    btn.disabled = true;

    const payload = {
        nik: document.getElementById('formNik').value,
        kategori: document.getElementById('formKategori').value,
        bb: document.getElementById('bb').value,
        tb: document.getElementById('tb').value,
        tensi: document.getElementById('tensi') ? document.getElementById('tensi').value : '',
        gula: document.getElementById('gula') ? document.getElementById('gula').value : '',
        kolesterol: document.getElementById('kolesterol') ? document.getElementById('kolesterol').value : '',
        asam_urat: document.getElementById('asam_urat') ? document.getElementById('asam_urat').value : '',
        catatan: document.getElementById('catatan').value
    };

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify({ action: 'simpan_rm', data: payload })
        });
        
        tutupModal();
        // Panggil Custom Alert (Tipe: info / 1 tombol)
        await tampilkanAlert("Berhasil", "Data rekam medis berhasil disimpan ke Spreadsheet!", "info");
    } catch(err) {
        await tampilkanAlert("Gagal", "Terjadi kesalahan koneksi server.", "info");
    } finally {
        btn.innerText = 'Simpan Rekam Medis';
        btn.disabled = false;
    }
}
