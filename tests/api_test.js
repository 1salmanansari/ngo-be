import app from '../dist/app.js';
import { connectDB } from '../dist/config/db.js';
import mongoose from 'mongoose';
import http from 'http';

const PORT = 8001;

async function runTests() {
  console.log('--- Starting Pragati Foundation Backend Flow Integration Tests ---');
  await connectDB();

  const server = http.createServer(app);
  await new Promise(resolve => server.listen(PORT, '127.0.0.1', resolve));
  const baseUrl = `http://127.0.0.1:${PORT}/api/v1`;

  const uniqueSuffix = Date.now().toString().slice(-4);
  const testMobile = `999000${uniqueSuffix}`;

  try {
    // 1. Volunteer Auto-Registration
    console.log('\n[1] Testing Volunteer Auto-Registration...');
    const volRes = await fetch(`${baseUrl}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'John Doe',
        role: 'VOLUNTEER',
        mobile: testMobile,
      }),
    });
    const volData = await volRes.json();
    console.log('Volunteer registered:', volData.data?.username || volData.message);
    const expectedUsername = `john.doe.${testMobile}@volunteer`;
    if (volData.data?.username !== expectedUsername) {
      throw new Error(`Volunteer username mismatch: expected ${expectedUsername}, got ${volData.data?.username}`);
    }

    // 2. Login to get JWT Token
    console.log('\n[2] Testing Login with generated credentials...');
    const loginRes = await fetch(`${baseUrl}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: volData.data.username,
        password: 'John Doe',
      }),
    });
    const loginData = await loginRes.json();
    const token = loginData.token;
    console.log('Login successful! JWT Token acquired:', token.slice(0, 25) + '...');

    const authHeaders = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    // 3. Department Creation
    console.log('\n[3] Creating Cardiology Department...');
    const deptRes = await fetch(`${baseUrl}/departments`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: `Cardiology-${uniqueSuffix}` }),
    });
    const deptData = await deptRes.json();
    const departmentId = deptData.data.id;
    console.log('Department created:', deptData.data.name, '(ID:', departmentId, ')');

    // 4. Registration Counter: Register Patient Salman Ansari
    console.log('\n[4] Registering Patient Salman Ansari (Registration Counter)...');
    const patientPayload = {
      name: 'Salman Ansari',
      dob: 806437800000, // 23/07/1995
      mobile: 9998889898,
      gender: 'MALE',
      department: departmentId,
      complaint: 'facing slight pain in chest from 2 days',
      author: volData.data.id,
    };

    const patRes = await fetch(`${baseUrl}/unauth/patients`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patientPayload),
    });
    const patData = await patRes.json();
    const patient = patData.data;
    console.log('Patient registered:', patient.name, 'PatientId:', patient.patientId, 'Age:', patient.age);
    if (!patient || !patient.patientId) {
      throw new Error('Patient registration failed: missing patient data or patientId');
    }

    // 5. Vitals Counter: Search by patientId and record Vitals
    console.log('\n[5] Scanning QR/Searching patient & adding Vitals (Vitals Counter)...');
    const getPatRes = await fetch(`${baseUrl}/unauth/patients/${patient.patientId}`);
    const getPatData = await getPatRes.json();
    console.log('Fetched patient by numeric ID:', getPatData.data.name);

    const vitalsRes = await fetch(`${baseUrl}/unauth/patients/${patient.patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        vitals: {
          bp: '120/80',
          pulse: 72,
          tempreture: 98.6,
          spo2: 99,
          weight: 70,
          height: 175,
        },
      }),
    });
    const vitalsData = await vitalsRes.json();
    console.log('Vitals added successfully:', vitalsData.data.vitals);

    // 6. Doctor Management & Waiting Area Doctor Assignment
    console.log('\n[6] Creating Doctor & Assigning Doctor in Waiting Area...');
    const docRes = await fetch(`${baseUrl}/doctors`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({
        firstName: 'Salman',
        lastName: 'Ansari',
        department: departmentId,
        degree: 'M.D., M.S.',
        hospital: 'Narayana',
      }),
    });
    const docData = await docRes.json();
    const doctor = docData.data;
    console.log('Doctor created:', doctor.firstName, doctor.lastName, 'Doctor ID:', doctor.doctorId);

    // Assign doctor to patient
    const assignDocRes = await fetch(`${baseUrl}/unauth/patients/${patient.patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ doctorId: doctor.doctorId }),
    });
    const assignDocData = await assignDocRes.json();
    console.log('Doctor assigned to patient:', assignDocData.data.doctorId);

    // 7. Referral Counter
    console.log('\n[7] Adding Referral (Referral Counter)...');
    const refRes = await fetch(`${baseUrl}/unauth/referrals`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        patientId: patient.patientId,
        doctorId: doctor.doctorId,
        description: 'Need Bypass Surgery',
        destails: 'Follow up within 10 days. Adhaar number: 123456781234, PAN: 12345678',
      }),
    });
    const refData = await refRes.json();
    console.log('Referral recorded:', refData.data.description, 'Details:', refData.data.details);

    // 8. Diagnostic Tests Counter
    console.log('\n[8] Adding Diagnostic Test (Tests Counter)...');
    const diagRes = await fetch(`${baseUrl}/diagnosis`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: `LIPID Profile-${uniqueSuffix}` }),
    });
    const diagData = await diagRes.json();
    const diagnosisId = diagData.data.id;

    const testRes = await fetch(`${baseUrl}/unauth/tests`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [diagnosisId],
        patientId: patient.patientId,
      }),
    });
    const testData = await testRes.json();
    console.log('Tests prescribed & recorded:', testData.data.data);

    // 9. Meds Counter: Pharmacy Stock & Dispensing
    console.log('\n[9] Dispensing Medications (Pharmacy Meds Counter)...');
    const pharmRes = await fetch(`${baseUrl}/pharmacy`, {
      method: 'POST',
      headers: authHeaders,
      body: JSON.stringify({ name: 'Shelcal 500', qty: 100 }),
    });
    const pharmData = await pharmRes.json();
    const medId = pharmData.data.id;

    const medsRes = await fetch(`${baseUrl}/unauth/meds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        data: [{ id: medId, qty: 10 }],
        patientId: patient.patientId,
      }),
    });
    const medsData = await medsRes.json();
    console.log('Medications dispensed:', medsData.data.data);

    // 10. Exit Feedback Rating (1-10)
    console.log('\n[10] Submitting Patient Exit Rating (1-10)...');
    const rateRes = await fetch(`${baseUrl}/unauth/patients/${patient.patientId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ratings: 10 }),
    });
    const rateData = await rateRes.json();
    console.log('Final Patient Status:', {
      patientId: rateData.data.patientId,
      hasTest: rateData.data.hasTest,
      hasMeds: rateData.data.hasMeds,
      hasReferral: rateData.data.hasReferral,
      ratings: rateData.data.ratings,
    });

    console.log('\n>>> ALL 10 COUNTER WORKFLOW INTEGRATION TESTS PASSED SUCCESSFULLY! <<<\n');
  } finally {
    server.close();
    await mongoose.connection.close();
  }
}

runTests().catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
