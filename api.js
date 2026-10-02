// KODE INI HARUS DI-COPY-PASTE KE DALAM EDITOR APPS SCRIPT DI GOOGLE SHEETS ANDA
// (Ekstensi > Apps Script), lalu hapus kode yang lama.

// Nama-nama sheet yang digunakan
const SHEET_MASTER = "Master_Peserta";
const SHEET_REKAM = "Rekam_Medis";
const SHEET_DASHBOARD = "Dashboard_Cache";
const SHEET_KADER = "Master_Kader";

// Fungsi ini dipanggil secara otomatis saat ada request HTTP GET dari Web Frontend
function doGet(e) {
  const action = e.parameter.action; // Parameter yang dikirim dari web
  let responseData = {};

  try {
    if (action === "getDashboard") {
      responseData = getDashboardData();
    } else if (action === "searchPeserta") {
      responseData = searchPeserta(e.parameter.query);
    } else if (action === "getRiwayat") {
      responseData = getRiwayatPasien(e.parameter.nik);
    } else if (action === "login") {
      responseData = handleLogin(e.parameter.username, e.parameter.password);
    } else {
      responseData = { status: "error", message: "Aksi tidak dikenal." };
    }
  } catch (error) {
    responseData = { status: "error", message: error.toString() };
  }

  // Mengembalikan output dalam format JSON yang dapat dibaca oleh web
  return ContentService.createTextOutput(JSON.stringify(responseData))
    .setMimeType(ContentService.MimeType.JSON);
}

function handleLogin(username, password) {
  if (!username || !password) return { status: "error", message: "Username dan password diperlukan." };

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_KADER);
  if (!sheet) return { status: "error", message: "Data kader tidak ditemukan." };

  const data = sheet.getDataRange().getValues();
  
  // Melewati baris pertama (Header)
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] === username && data[i][1] === password) {
       // Catat timestamp login (Opsional)
       sheet.getRange(i + 1, 6).setValue(new Date());

       return { 
         status: "success", 
         user: {
           username: data[i][0],
           nama_lengkap: data[i][2],
           role: data[i][3]
         }
       };
    }
  }
  return { status: "error", message: "Username atau password salah." };
}

function getDashboardData() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_DASHBOARD);
  if (!sheet) return { status: "error", message: "Sheet Dashboard_Cache tidak ditemukan." };

  const data = sheet.getDataRange().getValues();
  let result = {};
  
  // Melewati baris pertama (Header)
  for (let i = 1; i < data.length; i++) {
    let key = data[i][0];
    let value = data[i][1];
    if (key) result[key] = value;
  }
  return { status: "success", data: result };
}

function searchPeserta(query) {
  if (!query) return { status: "error", message: "Query kosong." };
  query = query.toString().toLowerCase();

  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_MASTER);
  if (!sheet) return { status: "error", message: "Data master peserta tidak ditemukan." };

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  let results = [];
  // Pencarian (bisa berdasarkan NIK atau Nama)
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const nik = row[0].toString().toLowerCase();
    const nama = row[2].toString().toLowerCase();
    
    if (nik.includes(query) || nama.includes(query)) {
      let person = {};
      for (let j = 0; j < headers.length; j++) {
        person[headers[j]] = row[j];
      }
      results.push(person);
    }
  }
  return { status: "success", data: results };
}

function getRiwayatPasien(nik) {
  if (!nik) return { status: "error", message: "NIK kosong." };
  
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetRekam = ss.getSheetByName(SHEET_REKAM);
  if (!sheetRekam) return { status: "error", message: "Data rekam medis tidak ditemukan." };

  const dataRekam = sheetRekam.getDataRange().getValues();
  const headers = dataRekam[0];
  
  let riwayat = [];
  for (let i = 1; i < dataRekam.length; i++) {
    const row = dataRekam[i];
    if (row[2].toString() === nik.toString()) { // Kolom indeks 2 adalah NIK_Pasien
      let rekam = {};
      for (let j = 0; j < headers.length; j++) {
        rekam[headers[j]] = row[j];
      }
      riwayat.push(rekam);
    }
  }
  
  // Urutkan dari yang terbaru (asumsi Timestamp bisa di-parse)
  // riwayat.sort((a,b) => new Date(b.Timestamp) - new Date(a.Timestamp));
  
  return { status: "success", data: riwayat };
}

/* 
  LANGKAH DEPLOYMENT (PENTING!):
  1. Klik "Terapkan" (Deploy) > "Deployment Baru" (New Deployment).
  2. Pilih jenis "Aplikasi Web" (Web app).
  3. Akses: "Siapa saja" (Anyone).
  4. Salin "URL Web App" yang dihasilkan.
  5. URL tersebut akan Anda butuhkan untuk di-paste ke file HTML Frontend nanti.
*/
