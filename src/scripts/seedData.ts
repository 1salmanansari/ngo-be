import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";

import { connectDB } from "../config/db.js";
import { Department } from "../models/Department.js";
import { Doctor } from "../models/Doctor.js";
import { User } from "../models/User.js";
import { Patient, IVitals } from "../models/Patient.js";
import { Pharmacy } from "../models/Pharmacy.js";
import { Diagnosis } from "../models/Diagnosis.js";
import { PrescribeMeds } from "../models/PrescribeMeds.js";
import { PrescribeTest } from "../models/PrescribeTest.js";
import { Referral } from "../models/Referral.js";
import { Counter } from "../models/Counter.js";
import { cache } from "../config/redis.js";

dotenv.config();

// 1. Departments required by user (25 items)
const DEPARTMENTS = [
  "CARDIOLOGY",
  "DERMATOLOGY",
  "ENDOCRINOLOGY",
  "GASTROENTEROLOGY",
  "GERIATRICS",
  "HEMATOLOGY ONCOLOGY",
  "INFECTIOUS DISEASE",
  "NEPHROLOGY",
  "NEUROLOGY",
  "PULMONOLOGY",
  "RHEUMATOLOGY",
  "GENERAL SURGERY",
  "NEUROSURGERY",
  "ORTHOPEDIC SURGERY",
  "PLASTIC SURGERY",
  "UROLOGY",
  "PEDIATRICS",
  "OBGYN",
  "ANESTHESIOLOGY",
  "EMERGENCY MEDICINE",
  "PSYCHIATRY",
  "RADIOLOGY",
  "PATHOLOGY",
  "REHABILITATION MEDICINE",
  "GENERAL PRACTICE",
];

// 2. Diagnosis required by user (12 items)
const DIAGNOSES = [
  "CBC",
  "Lipid Profile",
  "Blood Culture",
  "CMP",
  "HbA1c",
  "TSH, T3, T4",
  "Ultrasound",
  "X-Ray",
  "ECG",
  "Echo",
  "EEG",
  "PFT",
];

// 3. Pharmacy items required by user (50 items)
const PHARMACY_ITEMS = [
  { name: "Atorvastatin", qty: 90 },
  { name: "Lisinopril", qty: 30 },
  { name: "Amlodipine", qty: 60 },
  { name: "Metoprolol Succinate", qty: 45 },
  { name: "Losartan", qty: 100 },
  { name: "Hydrochlorothiazide", qty: 28 },
  { name: "Clopidogrel", qty: 90 },
  { name: "Rosuvastatin", qty: 50 },
  { name: "Carvedilol", qty: 60 },
  { name: "Spironolactone", qty: 30 },
  { name: "Metformin", qty: 180 },
  { name: "Glipizide", qty: 90 },
  { name: "Sitagliptin", qty: 30 },
  { name: "Empagliflozin", qty: 45 },
  { name: "Liraglutide", qty: 3 },
  { name: "Ibuprofen", qty: 120 },
  { name: "Acetaminophen", qty: 100 },
  { name: "Meloxicam", qty: 30 },
  { name: "Naproxen", qty: 60 },
  { name: "Gabapentin", qty: 90 },
  { name: "Celecoxib", qty: 45 },
  { name: "Tramadol", qty: 20 },
  { name: "Prednisone", qty: 21 },
  { name: "Albuterol", qty: 2 },
  { name: "Fluticasone Propionate", qty: 1 },
  { name: "Montelukast", qty: 30 },
  { name: "Cetirizine", qty: 90 },
  { name: "Loratadine", qty: 60 },
  { name: "Budensanide", qty: 60 },
  { name: "Sertraline", qty: 30 },
  { name: "Escitalopram", qty: 60 },
  { name: "Fluoxetine", qty: 45 },
  { name: "Duloxetine", qty: 30 },
  { name: "Alprazolam", qty: 15 },
  { name: "Clonazepam", qty: 30 },
  { name: "Levetiracetam", qty: 120 },
  { name: "Donepezil", qty: 90 },
  { name: "Omeprazole", qty: 60 },
  { name: "Pantoprazole", qty: 30 },
  { name: "Famotidine", qty: 50 },
  { name: "Ondansetron", qty: 12 },
  { name: "Amoxicillin", qty: 20 },
  { name: "Azithromycin", qty: 6 },
  { name: "Cephalexin", qty: 28 },
  { name: "Ciprofloxacin", qty: 14 },
  { name: "Acyclovir", qty: 40 },
  { name: "Levothyroxine", qty: 90 },
  { name: "Vitamin D3 (Cholecalciferol)", qty: 12 },
  { name: "Allopurinol", qty: 60 },
  { name: "Folic Acid", qty: 100 },
];

// Names for doctors & volunteers
const FIRST_NAMES_MALE = [
  "Rajesh",
  "Sanjay",
  "Vikram",
  "Deepak",
  "Manish",
  "Sunil",
  "Amit",
  "Rahul",
  "Anil",
  "Manoj",
  "Pradeep",
  "Alok",
  "Sameer",
  "Nitin",
  "Kishore",
  "Arun",
  "Prakash",
  "Girish",
  "Vivek",
  "Dinesh",
  "Suresh",
  "Mahesh",
  "Ramesh",
  "Ajay",
  "Sachin",
  "Vijay",
  "Ashok",
  "Kunal",
  "Harish",
  "Pankaj",
  "Gaurav",
  "Rohit",
  "Karan",
  "Vishal",
  "Mohit",
  "Naveen",
  "Abhishek",
  "Chetan",
  "Tushar",
  "Siddharth",
];

const FIRST_NAMES_FEMALE = [
  "Anjali",
  "Sneha",
  "Kavita",
  "Priyanka",
  "Pooja",
  "Sunita",
  "Anita",
  "Rekha",
  "Meena",
  "Ritu",
  "Deepa",
  "Sangeeta",
  "Shalini",
  "Swati",
  "Rashmi",
  "Archana",
  "Aarti",
  "Neelam",
  "Divya",
  "Vandana",
  "Mamta",
  "Preeti",
  "Seema",
  "Geeta",
  "Kiran",
  "Usha",
  "Shobha",
  "Radha",
  "Nisha",
  "Monika",
  "Pallavi",
  "Smita",
  "Tanvi",
  "Rupal",
  "Komal",
  "Shikha",
  "Jyoti",
  "Aparna",
  "Richa",
  "Suman",
];

const LAST_NAMES = [
  "Sharma",
  "Verma",
  "Mehta",
  "Patel",
  "Ansari",
  "Deshmukh",
  "Kulkarni",
  "Shah",
  "Nair",
  "Iyer",
  "Banerjee",
  "Gupta",
  "Rao",
  "Chauhan",
  "Joshi",
  "Bhatia",
  "Khan",
  "Jadhav",
  "More",
  "Pawar",
  "Shinde",
  "Gaikwad",
  "Tambe",
  "Sawant",
  "Mishra",
  "Pandey",
  "Trivedi",
  "Dubey",
  "Yadav",
  "Singh",
  "Reddy",
  "Ghosh",
  "Das",
  "Bose",
  "Dutta",
  "Sengupta",
  "Chakraborty",
  "Kapoor",
  "Malhotra",
  "Khanna",
];

const HOSPITALS = [
  "Lilavati Hospital & Research Centre",
  "P. D. Hinduja National Hospital",
  "Fortis Healthcare Hospital",
  "Kokilaben Dhirubhai Ambani Hospital",
  "Tata Memorial Hospital",
  "King Edward Memorial (KEM) Hospital",
  "Nanavati Max Super Speciality Hospital",
  "Apollo Hospitals Mumbai",
  "Wockhardt Hospitals",
  "Dr. L H Hiranandani Hospital",
  "Jaslok Hospital & Research Centre",
  "Saifee Hospital",
];

const DEGREES = [
  "MBBS, MD",
  "MBBS, MS",
  "MBBS, DNB",
  "MBBS, DM",
  "MBBS, MCh",
  "MBBS, DCH",
  "MBBS, DGO",
  "MBBS",
];

const LOCALITIES = [
  "Dharavi, Mumbai",
  "Kurla West, Mumbai",
  "Govandi, Mumbai",
  "Malad East, Mumbai",
  "Andheri East, Mumbai",
  "Ghatkopar West, Mumbai",
  "Bandra East, Mumbai",
  "Chembur, Mumbai",
  "Mulund West, Mumbai",
  "Thane West, Thane",
  "Bhiwandi, Thane",
  "Vashi, Navi Mumbai",
  "Koparkhairane, Navi Mumbai",
  "Panvel, Raigad",
  "Kalyan West, Thane",
  "Dombivli East, Thane",
  "Mira Road, Thane",
  "Borivali West, Mumbai",
];

const COMPLAINTS_BY_DEPT: Record<string, string[]> = {
  CARDIOLOGY: [
    "Experiencing slight pain in chest from 2 days",
    "Shortness of breath on mild exertion and walking",
    "Heart palpitation and irregular pulse episodes",
    "High blood pressure fluctuation and morning headache",
    "Post-angioplasty routine checkup and medication review",
  ],
  DERMATOLOGY: [
    "Persistent itchy red rash on forearms and neck",
    "Chronic eczema flare-up with dry scaly skin",
    "Fungal infection on toes and nails causing discomfort",
    "Allergic dermatitis reaction after using local soap",
    "Psoriasis patches on elbows with severe itching",
  ],
  ENDOCRINOLOGY: [
    "Uncontrolled fasting blood sugar levels above 220",
    "Thyroid gland enlargement with chronic fatigue",
    "Sudden unexplained weight loss and excessive thirst",
    "Type 2 diabetes quarterly review and HbA1c screening",
  ],
  GASTROENTEROLOGY: [
    "Severe abdominal burning sensation and acid reflux",
    "Chronic indigestion, bloating, and loss of appetite",
    "Recurrent loose motions and dehydration symptoms",
    "Suspected peptic ulcer with epigastric discomfort",
  ],
  GERIATRICS: [
    "Generalized frailty, weakness, and loss of balance",
    "Memory lapses and mild confusion in elderly individual",
    "Multiple joint aches and decreased mobility",
    "Comprehensive geriatric health screening",
  ],
  "HEMATOLOGY ONCOLOGY": [
    "Severe paleness, persistent fatigue, and low hemoglobin",
    "Swollen lymph nodes in cervical region for 4 weeks",
    "Frequent unexplained bruising on lower limbs",
  ],
  "INFECTIOUS DISEASE": [
    "Intermittent high-grade fever with chills for 5 days",
    "Prolonged viral syndrome with body ache and weakness",
    "Productive cough with yellowish sputum and mild fever",
  ],
  NEPHROLOGY: [
    "Bilateral pedal edema and facial puffiness in morning",
    "Reduced urine frequency and burning micturition",
    "Elevated serum creatinine detected in prior test",
  ],
  NEUROLOGY: [
    "Frequent throbbing unilateral headache with photophobia",
    "Numbness and tingling sensation in fingers and feet",
    "Recurrent vertigo and dizziness upon changing posture",
    "Mild tremors in right hand while holding objects",
  ],
  PULMONOLOGY: [
    "Dry chronic cough persisting for over 3 weeks",
    "Wheezing and chest tightness aggravated at night",
    "Breathlessness after climbing one flight of stairs",
    "Chronic bronchitis symptoms and smoker's cough",
  ],
  RHEUMATOLOGY: [
    "Morning joint stiffness in hands lasting over 1 hour",
    "Swelling and tenderness in small joints of both hands",
    "Severe lower back stiffness and chronic inflammatory pain",
  ],
  "GENERAL SURGERY": [
    "Right lower quadrant pain suspected chronic appendicitis",
    "Swelling in right inguinal region on standing",
    "Painful anal fissure and bleeding during defecation",
  ],
  NEUROSURGERY: [
    "Radiating pain from lower back down left leg (sciatica)",
    "Severe cervical neck pain with numbness in right arm",
  ],
  "ORTHOPEDIC SURGERY": [
    "Severe bilateral knee pain while walking and climbing",
    "Chronic lower back pain aggravated by sitting",
    "Right shoulder joint stiffness and frozen shoulder",
    "Post-fall wrist pain and localized swelling",
  ],
  "PLASTIC SURGERY": [
    "Old burn scar contracture causing finger movement restriction",
    "Benign sebaceous cyst on scalp requesting surgical evaluation",
  ],
  UROLOGY: [
    "Difficult and painful urination with weak urinary stream",
    "Severe right flank pain radiating to groin (kidney stone)",
    "Increased urinary frequency at night (nocturia)",
  ],
  PEDIATRICS: [
    "Recurrent seasonal cold, cough, and low-grade fever",
    "Poor appetite and underweight assessment in toddler",
    "Childhood asthma and intermittent wheezing",
  ],
  OBGYN: [
    "Irregular menstrual cycles with severe dysmenorrhea",
    "Routine antenatal health checkup in second trimester",
    "White vaginal discharge and lower abdominal discomfort",
  ],
  ANESTHESIOLOGY: [
    "Pre-anesthetic evaluation and chronic pain management",
    "Chronic nerve pain consultation following old surgery",
  ],
  "EMERGENCY MEDICINE": [
    "Acute sudden headache with elevated blood pressure",
    "Acute gastroenteritis with mild dehydration",
    "Minor soft tissue injury after slipping on pavement",
  ],
  PSYCHIATRY: [
    "Persistent anxiety, panic sensations, and sleeplessness",
    "Low mood, loss of interest in activities, and fatigue",
    "Severe tension headache associated with work stress",
  ],
  RADIOLOGY: [
    "Referred for abdominal ultrasound to assess gallstones",
    "Referred for chest X-ray screening for persistent cough",
  ],
  PATHOLOGY: [
    "Comprehensive blood work checkup and metabolic screening",
    "Anemia profile and iron deficiency blood examination",
  ],
  "REHABILITATION MEDICINE": [
    "Post-stroke physical therapy and gait training evaluation",
    "Post-fracture stiffness in elbow requiring rehabilitation",
  ],
  "GENERAL PRACTICE": [
    "General malaise, fatigue, and routine camp health checkup",
    "Mild seasonal viral body ache and throat irritation",
    "General screening for diabetes, hypertension, and BMI",
  ],
};

function getRandomItem<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getRandomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function seed() {
  console.log("=================================================");
  console.log(" Pragati Foundation Medical Camp — Master Seeder");
  console.log("=================================================");

  await connectDB();

  // Clear redis cache
  try {
    await cache.delPattern("*");
    console.log(" Redis cache cleared.");
  } catch {}

  // ----------------------------------------------------------------
  // 1. Seed Departments (25)
  // ----------------------------------------------------------------
  console.log("\n[1/9] Seeding 25 Departments...");
  await Department.deleteMany({});
  const departmentDocs = DEPARTMENTS.map((deptName) => ({
    id: uuidv4(),
    name: deptName,
    created: Date.now() - getRandomInt(10, 20) * 86400000,
    updated: Date.now(),
  }));
  await Department.insertMany(departmentDocs);
  console.log(` Created ${departmentDocs.length} Departments.`);

  // ----------------------------------------------------------------
  // 2. Seed Diagnosis (12)
  // ----------------------------------------------------------------
  console.log("\n[2/9] Seeding 12 Diagnosis tests...");
  await Diagnosis.deleteMany({});
  const diagnosisDocs = DIAGNOSES.map((diagName) => ({
    id: uuidv4(),
    name: diagName,
    created: Date.now() - getRandomInt(10, 20) * 86400000,
    updated: Date.now(),
  }));
  await Diagnosis.insertMany(diagnosisDocs);
  console.log(` Created ${diagnosisDocs.length} Diagnosis tests.`);

  // ----------------------------------------------------------------
  // 3. Seed Pharmacy (50 items)
  // ----------------------------------------------------------------
  console.log("\n[3/9] Seeding 50 Pharmacy medications...");
  await Pharmacy.deleteMany({});
  const pharmacyDocs = PHARMACY_ITEMS.map((item) => ({
    id: uuidv4(),
    name: item.name,
    qty: item.qty,
    created: Date.now() - getRandomInt(10, 20) * 86400000,
    updated: Date.now(),
  }));
  await Pharmacy.insertMany(pharmacyDocs);
  console.log(` Created ${pharmacyDocs.length} Pharmacy medications.`);

  // ----------------------------------------------------------------
  // 4. Seed Volunteers (50 users)
  // ----------------------------------------------------------------
  console.log("\n[4/9] Seeding 50 Volunteers (keeping existing ADMIN)...");
  // Delete non-admin users only
  await User.deleteMany({ role: "VOLUNTEER" });
  const hashedPassword = await bcrypt.hash("volunteer123", 10);

  const volunteerDocs = [];
  for (let i = 1; i <= 50; i++) {
    const isFemale = i % 2 === 0;
    const fName = isFemale
      ? FIRST_NAMES_FEMALE[i % FIRST_NAMES_FEMALE.length]
      : FIRST_NAMES_MALE[i % FIRST_NAMES_MALE.length];
    const lName = LAST_NAMES[(i * 3) % LAST_NAMES.length];

    volunteerDocs.push({
      id: uuidv4(),
      name: `${fName} ${lName}`,
      username: `volunteer${i}`,
      password: hashedPassword,
      role: "VOLUNTEER" as const,
      created: Date.now() - getRandomInt(5, 15) * 86400000,
      updated: Date.now(),
    });
  }
  await User.insertMany(volunteerDocs);
  console.log(` Created 50 Volunteers (User role: VOLUNTEER).`);

  // Ensure default admin exists
  const adminExists = await User.findOne({ username: "admin" });
  if (!adminExists) {
    const adminHashed = await bcrypt.hash("admin", 10);
    await User.create({
      id: uuidv4(),
      name: "ADMIN",
      username: "admin",
      password: adminHashed,
      role: "ADMIN",
      created: Date.now(),
      updated: Date.now(),
    });
    console.log(" Admin user ensured: admin / admin");
  } else {
    console.log(" Existing ADMIN user preserved.");
  }

  // ----------------------------------------------------------------
  // 5. Seed Doctors (40)
  // ----------------------------------------------------------------
  console.log("\n[5/9] Seeding 40 Doctors across departments...");
  await Doctor.deleteMany({});
  const doctorDocs = [];

  // Guarantee all 25 departments have at least 1 doctor, rest distributed
  const assignedDepts: string[] = [...DEPARTMENTS];
  while (assignedDepts.length < 40) {
    assignedDepts.push(getRandomItem(DEPARTMENTS));
  }

  for (let i = 1; i <= 40; i++) {
    const isFemale = i % 3 === 0;
    const fName = isFemale
      ? FIRST_NAMES_FEMALE[(i * 2) % FIRST_NAMES_FEMALE.length]
      : FIRST_NAMES_MALE[(i * 2) % FIRST_NAMES_MALE.length];
    const lName = LAST_NAMES[(i * 5) % LAST_NAMES.length];
    const dept = assignedDepts[i - 1];
    const degree = getRandomItem(DEGREES);
    const hospital = getRandomItem(HOSPITALS);

    doctorDocs.push({
      id: uuidv4(),
      doctorId: i,
      firstName: fName,
      lastName: lName,
      department: dept,
      degree,
      hospital,
      created: Date.now() - getRandomInt(7, 20) * 86400000,
      updated: Date.now(),
    });
  }
  await Doctor.insertMany(doctorDocs);
  await Counter.findByIdAndUpdate("doctorId", { seq: 40 }, { upsert: true });
  console.log(` Created 40 Doctors (Doctor IDs: 1 to 40).`);

  // Map doctors by department for realistic assignment
  const doctorsByDept: Record<string, any[]> = {};
  doctorDocs.forEach((d) => {
    if (!doctorsByDept[d.department]) {
      doctorsByDept[d.department] = [];
    }
    doctorsByDept[d.department].push(d);
  });

  // ----------------------------------------------------------------
  // 6. Seed Patients (1000)
  // ----------------------------------------------------------------
  console.log(
    "\n[6/9] Seeding 1,000 Patients with realistic clinical records...",
  );
  await Patient.deleteMany({});

  const now = Date.now();
  const patientDocs = [];

  for (let i = 1; i <= 1000; i++) {
    const isFemale = Math.random() < 0.48;
    const fName = isFemale
      ? getRandomItem(FIRST_NAMES_FEMALE)
      : getRandomItem(FIRST_NAMES_MALE);
    const lName = getRandomItem(LAST_NAMES);
    const age = getRandomInt(6, 84);
    // Registration time distributed over the last 14 days
    const daysAgo = Math.floor((i / 1000) * 14);
    const created = now - daysAgo * 86400000 - getRandomInt(0, 43200000);
    const dob = created - age * 365.25 * 24 * 60 * 60 * 1000;

    const dept = getRandomItem(DEPARTMENTS);
    const complaints =
      COMPLAINTS_BY_DEPT[dept] || COMPLAINTS_BY_DEPT["GENERAL PRACTICE"];
    const complaint = getRandomItem(complaints);

    // Volunteer author
    const authorVol = getRandomItem(volunteerDocs);

    // Assigned doctor
    const deptDoctors = doctorsByDept[dept] || doctorDocs;
    const assignedDoc = getRandomItem(deptDoctors);

    // Vitals for ~88% of patients
    const hasVitals = Math.random() < 0.88;
    let vitals: IVitals | undefined = undefined;
    if (hasVitals) {
      const systolic = getRandomInt(110, 145);
      const diastolic = getRandomInt(70, 92);
      vitals = {
        bp: `${systolic}/${diastolic}`,
        pulse: getRandomInt(66, 96),
        tempreture: parseFloat((97.8 + Math.random() * 2.1).toFixed(1)),
        spo2: getRandomInt(95, 100),
        weight: getRandomInt(42, 88),
        height: getRandomInt(148, 184),
      };
    }

    // Ratings for ~65% of patients
    const hasRating = Math.random() < 0.65;
    const ratingWeights = [7, 8, 8, 9, 9, 10, 10, 6, 8, 9, 10];
    const rating = hasRating ? getRandomItem(ratingWeights) : undefined;

    const mobilePrefix = getRandomItem([
      9820, 9819, 9869, 9892, 9769, 9833, 9920, 9967,
    ]);
    const mobile = mobilePrefix * 1000000 + getRandomInt(100000, 999999);

    patientDocs.push({
      id: uuidv4(),
      patientId: i,
      name: `${fName} ${lName}`,
      age,
      dob: Math.floor(dob),
      mobile,
      gender: isFemale ? ("FEMALE" as const) : ("MALE" as const),
      address: getRandomItem(LOCALITIES),
      complaint,
      department: dept,
      doctorId: assignedDoc.doctorId,
      author: authorVol.id,
      vitals,
      ratings: rating,
      hasTest: false,
      hasMeds: false,
      hasReferral: false,
      created,
      updated: created + getRandomInt(600000, 7200000),
    });
  }

  // ----------------------------------------------------------------
  // 7. Seed PrescribeMeds (200 records)
  // ----------------------------------------------------------------
  console.log(
    "\n[7/9] Seeding 200 PrescribeMeds records aligned with doctors & patients...",
  );
  await PrescribeMeds.deleteMany({});

  // Pick 200 distinct patients
  const shuffledPatientsForMeds = [...patientDocs]
    .sort(() => 0.5 - Math.random())
    .slice(0, 200);
  const prescribeMedsDocs = [];

  for (const patient of shuffledPatientsForMeds) {
    patient.hasMeds = true;

    // Pick 1 to 3 random medicines
    const medCount = getRandomInt(1, 3);
    const chosenMeds: any[] = [];
    const usedPharmacyIds = new Set<string>();

    for (let m = 0; m < medCount; m++) {
      const pharm = getRandomItem(pharmacyDocs);
      if (!usedPharmacyIds.has(pharm.id)) {
        usedPharmacyIds.add(pharm.id);
        const qty = getRandomInt(1, 3);
        chosenMeds.push({
          id: pharm.id,
          qty,
        });
      }
    }

    prescribeMedsDocs.push({
      id: uuidv4(),
      patientId: patient.patientId,
      doctorId: patient.doctorId,
      data: chosenMeds,
      created: patient.created + getRandomInt(1800000, 3600000),
      updated: patient.created + getRandomInt(1800000, 3600000),
    });
  }
  await PrescribeMeds.insertMany(prescribeMedsDocs);
  console.log(` Created 200 PrescribeMeds records.`);

  // ----------------------------------------------------------------
  // 8. Seed PrescribeTest (200 records)
  // ----------------------------------------------------------------
  console.log(
    "\n[8/9] Seeding 200 PrescribeTest records aligned with doctors & patients...",
  );
  await PrescribeTest.deleteMany({});

  // Pick 200 distinct patients
  const shuffledPatientsForTests = [...patientDocs]
    .sort(() => 0.5 - Math.random())
    .slice(0, 200);
  const prescribeTestDocs = [];

  for (const patient of shuffledPatientsForTests) {
    patient.hasTest = true;

    // Pick 1 to 3 tests
    const testCount = getRandomInt(1, 3);
    const chosenTestIds: string[] = [];
    const usedDiagIds = new Set<string>();

    for (let t = 0; t < testCount; t++) {
      const diag = getRandomItem(diagnosisDocs);
      if (!usedDiagIds.has(diag.id)) {
        usedDiagIds.add(diag.id);
        chosenTestIds.push(diag.id);
      }
    }

    prescribeTestDocs.push({
      id: uuidv4(),
      patientId: patient.patientId,
      doctorId: patient.doctorId,
      data: chosenTestIds,
      created: patient.created + getRandomInt(1200000, 2400000),
      updated: patient.created + getRandomInt(1200000, 2400000),
    });
  }
  await PrescribeTest.insertMany(prescribeTestDocs);
  console.log(` Created 200 PrescribeTest records.`);

  // ----------------------------------------------------------------
  // 9. Seed Referrals (100 records)
  // ----------------------------------------------------------------
  console.log(
    "\n[9/9] Seeding 100 Referral records aligned with doctors & patients...",
  );
  await Referral.deleteMany({});

  const REFERRAL_REASONS = [
    "Requires detailed 2D Echocardiography and Senior Cardiology OPD assessment",
    "Suspected L4-L5 disc herniation; advised urgent MRI Lumbosacral Spine",
    "Diabetic retinopathy screening required at Tertiary Hospital Ophthalmology Centre",
    "Severe microcytic hypochromic anemia; advised hematology workup and blood transfusion",
    "Surgical evaluation for symptomatic right inguinal hernia repair",
    "Upper GI Endoscopy advised for chronic recurrent epigastric pain and suspected ulcer",
    "High-resolution CT Thorax recommended for persistent non-resolving consolidation",
    "Neurology referral for intractable migraine and focal neurological signs",
    "Nephrology evaluation for progressive proteinuria and worsening renal parameters",
    "Pediatric cardiology evaluation for newly auscultated systolic murmur",
  ];

  // Pick 100 distinct patients
  const shuffledPatientsForReferrals = [...patientDocs]
    .sort(() => 0.5 - Math.random())
    .slice(0, 100);
  const referralDocs = [];

  for (const patient of shuffledPatientsForReferrals) {
    patient.hasReferral = true;

    const desc = getRandomItem(REFERRAL_REASONS);
    const details = `Follow-up required within 7-10 days at Civil Hospital OPD. Patient Mobile: +91-${patient.mobile}. Emergency Contact verified. Ayushman / Ration card presented.`;

    referralDocs.push({
      id: uuidv4(),
      patientId: patient.patientId,
      doctorId: patient.doctorId,
      description: desc,
      details,
      created: patient.created + getRandomInt(2400000, 5400000),
      updated: patient.created + getRandomInt(2400000, 5400000),
    });
  }
  await Referral.insertMany(referralDocs);
  console.log(` Created 100 Referral records.`);

  // Save all 1000 patients with their updated hasMeds, hasTest, hasReferral flags!
  await Patient.insertMany(patientDocs);
  await Counter.findByIdAndUpdate("patientId", { seq: 1000 }, { upsert: true });
  console.log(` Inserted 1,000 Patients with patientIds 1 to 1000.`);

  console.log("\n=================================================");
  console.log(" SEEDING COMPLETED SUCCESSFULLY!");
  console.log(` - Departments:  ${departmentDocs.length}`);
  console.log(` - Diagnosis:    ${diagnosisDocs.length}`);
  console.log(` - Pharmacy:     ${pharmacyDocs.length}`);
  console.log(` - Volunteers:   ${volunteerDocs.length}`);
  console.log(` - Doctors:      ${doctorDocs.length} (IDs 1-40)`);
  console.log(` - Patients:     ${patientDocs.length} (IDs 1-1000)`);
  console.log(` - PrescribeMeds:${prescribeMedsDocs.length}`);
  console.log(` - PrescribeTest:${prescribeTestDocs.length}`);
  console.log(` - Referrals:    ${referralDocs.length}`);
  console.log("=================================================");

  await mongoose.disconnect();
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed with error:", err);
  process.exit(1);
});
