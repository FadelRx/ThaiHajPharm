function doGet() {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('DRPMS')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// ฟังก์ชัน include() ใช้เรียกไฟล์ HTML อื่นๆ
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

// ตรวจสอบ Login
function login(username, password) {
  const sheet = SpreadsheetApp.openById('1qFy0whbR2YDKCT5x1kPpnMjMxnIk2csZZBHUAWB1uIc').getSheetByName('Users');
  const data = sheet.getDataRange().getValues();
  const user = data.find(row => row[0] === username && row[1] === password);

  if (user) {
    return {
      success: true,
      user: {
        username: user[0],
        hospital: user[2],
      },
    };
  } else {
    return { success: false };
  }
}


// ดึงข้อมูลคนไข้
function getPatients(user) {
  const sheet = SpreadsheetApp.openById('1qFy0whbR2YDKCT5x1kPpnMjMxnIk2csZZBHUAWB1uIc').getSheetByName('patients');
  const data = sheet.getDataRange().getValues();
  const patientData = data.slice(1); // ข้ามหัวตาราง

  const mapRowToPatient = row => ({
    uniqueId: row[0], // เพิ่ม UniqueID
    name: row[1],
    address: row[2],
    hospital: row[3],
    status: row[4],
    disease: row[5],
    symptoms: row[6],
    company: row[7],
    drugIssues: row[8],
    detail: row[9] || ''
  });

  if (user.hospital === 'Admin') {
    return patientData.map(mapRowToPatient);
  } else {
    return patientData
      .filter(row => row[10] === user.username) // กรองตาม username
      .map(mapRowToPatient);
  }
}



// บันทึกข้อมูลคนไข้
function savePatients(patients, user) {
  const sheet = SpreadsheetApp.openById('1qFy0whbR2YDKCT5x1kPpnMjMxnIk2csZZBHUAWB1uIc').getSheetByName('patients');
  const data = sheet.getDataRange().getValues();
  const uniqueIdColumnIndex = 0; // คอลัมน์ UniqueID

  // สร้างแผนที่ UniqueID -> แถว
  const idMap = new Map();
  data.slice(1).forEach((row, index) => {
    idMap.set(row[uniqueIdColumnIndex], index + 2); // แถวเริ่มต้นจาก 2 (1-based index)
  });

  // อัปเดตหรือเพิ่มข้อมูลใหม่
  patients.forEach(patient => {
    const uniqueId = patient.uniqueId || Utilities.getUuid(); // ใช้ UniqueID เดิมหรือสร้างใหม่
    const rowIndex = idMap.get(uniqueId);

    const rowData = [
      uniqueId, // เก็บ UniqueID
      patient.name,
      patient.address,
      patient.hospital,
      patient.status,
      patient.disease,
      patient.symptoms,
      patient.company,
      patient.drugIssues,
      patient.detail || '',
      user.username
    ];

    if (rowIndex) {
      // หากพบ UniqueID ใน Google Sheet ให้อัปเดตแถว
      sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
    } else {
      // หากไม่พบ UniqueID ให้เพิ่มแถวใหม่
      sheet.appendRow(rowData);
    }
  });
}



function getHospitals() {
  const sheet = SpreadsheetApp.openById('1qFy0whbR2YDKCT5x1kPpnMjMxnIk2csZZBHUAWB1uIc').getSheetByName('hospitals');
  const data = sheet.getDataRange().getValues();
  return data.flat(); // ดึงรายชื่อโรงพยาบาลทั้งหมด
}

function registerUser(userData) {
  const sheet = SpreadsheetApp.openById('1qFy0whbR2YDKCT5x1kPpnMjMxnIk2csZZBHUAWB1uIc').getSheetByName('users');
  const data = sheet.getDataRange().getValues();

  // ตรวจสอบว่าโรงพยาบาลมีผู้ใช้แล้วหรือไม่
  const existingUser = data.find(row => row[2] === userData.hospital);

  if (existingUser) {
    return { success: false, message: "โรงพยาบาลนี้มีผู้ใช้ลงทะเบียนแล้ว" };
  }

  // เพิ่มผู้ใช้ใหม่
  sheet.appendRow([userData.username, userData.password, userData.hospital]);
  return { success: true };
}

function deletePatient(uniqueId) {
  const sheet = SpreadsheetApp.openById('1qFy0whbR2YDKCT5x1kPpnMjMxnIk2csZZBHUAWB1uIc').getSheetByName('patients');
  const data = sheet.getDataRange().getValues();
  const uniqueIdColumnIndex = 0; // คอลัมน์ที่เก็บ UniqueID

  // ค้นหาแถวที่มี UniqueID ตรงกัน
  const rowIndex = data.findIndex(row => row[uniqueIdColumnIndex] === uniqueId);

  if (rowIndex > 0) { // แถว 0 คือหัวตาราง
    sheet.deleteRow(rowIndex + 1); // ลบแถว (เพิ่ม 1 เพราะ Google Sheet เริ่มแถวที่ 1)
    return { success: true };
  } else {
    return { success: false, message: 'ไม่พบข้อมูลที่ต้องการลบ' };
  }
}

function savePharmaceuticalCare(uniqueId, careData) {
  const sheet = SpreadsheetApp.openById('1qFy0whbR2YDKCT5x1kPpnMjMxnIk2csZZBHUAWB1uIc').getSheetByName('pharmaceutical_care');
  console.log(uniqueId,"sus");
  if (!sheet) {
    // ถ้าไม่มีชีต ให้สร้างใหม่
    sheet = SpreadsheetApp.openById('1qFy0whbR2YDKCT5x1kPpnMjMxnIk2csZZBHUAWB1uIc').insertSheet('pharmaceutical_care');
    sheet.appendRow(['UniqueID', 'Medication', 'Allergy', 'CareDetails', 'Timestamp']);
  }

  // เพิ่มข้อมูลการบริบาล
  sheet.appendRow([
    uniqueId,
    careData.medication,
    careData.allergy,
    careData.details,
    new Date().toLocaleString(),
    careData.recordId,
  ]);

  return { success: true, message: "บันทึกข้อมูลการบริบาลเรียบร้อยแล้ว" };
}

function getPharmaceuticalHistory(uniqueId) {
  Logger.log(uniqueId)
  try {
    const sheet = SpreadsheetApp.openById('1qFy0whbR2YDKCT5x1kPpnMjMxnIk2csZZBHUAWB1uIc').getSheetByName('pharmaceutical_care');
    if (!sheet) {
      Logger.log("ไม่พบชีต pharmaceutical_care");
      return { success: false, message: 'ไม่พบข้อมูลการบริบาลในระบบ' };
    } 

    const data = sheet.getDataRange().getValues();
    Logger.log("ข้อมูลทั้งหมด: " + JSON.stringify(data));

    const history = data.slice(1).filter(row => row[0] === uniqueId);
    Logger.log("ข้อมูลที่ตรงกับ UniqueID: " + JSON.stringify(history));

    if (history.length === 0) {
      return { success: false, message: 'ไม่พบประวัติการบริบาลสำหรับ UniqueID นี้' };
    }
     return JSON.stringify({
      success: true,
      history: history.map(row => ({
        medication: row[1] || '',
        allergy: row[2] || '',
        careDetails: row[3] || '',
        timestamp: row[4] || '',
      })),
    });
    // return {
    //   success: true,
    //   history: history.map(row => ({
    //     medication: row[1] || '',
    //     allergy: row[2] || '',
    //     careDetails: row[3] || '',
    //     timestamp: row[4] || '',
    //   })),
    // };
  } catch (error) {
    Logger.log("เกิดข้อผิดพลาด: " + error.message);
    return { success: false, message: 'เกิดข้อผิดพลาด: ' + error.message };
  }
}

 function test(){
  Logger.log("ผลลัพธ์ของฟังก์ชัน: " + JSON.stringify(getPharmaceuticalHistory('Hclnq0myv8')));
 }

function getUserStatistics(username, isAdmin) {
  const sheet = SpreadsheetApp.openById('1qFy0whbR2YDKCT5x1kPpnMjMxnIk2csZZBHUAWB1uIc').getSheetByName('Users');
  const data = sheet.getDataRange().getValues();

  if (isAdmin) {
    // คำนวณผลรวมสำหรับ Admin
    const totalPilgrims = 6600; // ค่าคงที่
    const pilgrimsInCharge = data.reduce((sum, row) => sum + (parseInt(row[3]) || 0), 0); // รวมคอลัมน์ที่ 4
    const pilgrimsScreened = data.reduce((sum, row) => sum + (parseInt(row[4]) || 0), 0); // รวมคอลัมน์ที่ 5

    return {
      success: true,
      totalPilgrims,
      pilgrimsInCharge,
      pilgrimsScreened,
    };
  } else {
    // ดึงข้อมูลเฉพาะของผู้ใช้
    const userRow = data.find(row => row[1] === username); // สมมติว่าคอลัมน์ที่ 2 คือ username
    if (!userRow) {
      return { success: false, message: 'ไม่พบข้อมูลผู้ใช้' };
    }

    return {
      success: true,
      totalPilgrims: 6600,
      pilgrimsInCharge: parseInt(userRow[3]) || 0,
      pilgrimsScreened: parseInt(userRow[4]) || 0
    };
  }
}


function updateUserStatistics(data) {
  const sheet = SpreadsheetApp.openById('1qFy0whbR2YDKCT5x1kPpnMjMxnIk2csZZBHUAWB1uIc').getSheetByName('Users');
  const users = sheet.getDataRange().getValues();

  // ค้นหาแถวที่ตรงกับชื่อผู้ใช้
  const rowIndex = users.findIndex(row => row[0] === data.username); // สมมติว่าชื่อผู้ใช้อยู่คอลัมน์แรก
  if (rowIndex < 0) {
    return { success: false, message: 'ไม่พบผู้ใช้งาน' };
  }

  // อัปเดตข้อมูลในแถวที่ค้นหาเจอ
  sheet.getRange(rowIndex + 1, 4).setValue(data.pilgrimsInCharge || 0); // คอลัมน์ 4 คือ Pilgrims In Charge
  sheet.getRange(rowIndex + 1, 5).setValue(data.pilgrimsScreened || 0); // คอลัมน์ 5 คือ Pilgrims Screened

  return { success: true, message: 'อัปเดตข้อมูลสำเร็จ' };
}

function updatePharmaceuticalCare(uniqueId, careIndex, editedCareData) {
  var sheet = SpreadsheetApp.openById('1qFy0whbR2YDKCT5x1kPpnMjMxnIk2csZZBHUAWB1uIc').getSheetByName('pharmaceutical_care');
  var data = sheet.getDataRange().getValues();

  for (var i = 1; i < data.length; i++) {
      if (data[i][0] == uniqueId) { // Column A = UniqueID
          var history = JSON.parse(data[i][1]); // Column B = JSON History

          if (!history[careIndex]) {
              return { success: false, message: "ไม่พบข้อมูลการบริบาลที่ต้องการแก้ไข" };
          }

          // อัปเดตข้อมูลที่แก้ไข
          history[careIndex].medication = editedCareData.medication;
          history[careIndex].allergy = editedCareData.allergy;
          history[careIndex].careDetails = editedCareData.details;
          history[careIndex].timestamp = new Date().toISOString(); // บันทึกเวลาล่าสุด

          // บันทึกกลับไปที่ Google Sheets
          sheet.getRange(i + 1, 2).setValue(JSON.stringify(history));

          return { success: true };
      }
  }
  return { success: false, message: "ไม่พบข้อมูลผู้ป่วย" };
}



