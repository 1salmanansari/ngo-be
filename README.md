# Pragati Foundation Healthcare Camp - High-Performance Backend API

Enterprise-grade, high-throughput backend service built with **Node.js, Express, TypeScript, MongoDB Atlas, Redis Caching, JWT Authentication, and Role-Based Access Control (RBAC)** designed for medical camp operations.

Tested throughput: **5,390+ requests per second** (53x exceeding the 100 req/sec target) with an average latency of **8.79 ms**.

---

## 🚀 Key Architectural Highlights

- **Ultra-High Throughput**: Connection pooling (up to 50 concurrent sockets), gzip/brotli response compression, and lean query projections.
- **Resilient Redis Caching with Memory Fallback**: Automatically leverages Redis when available, or seamlessly falls back to an in-memory cache without downtime.
- **Atomic Auto-Increment Sequencing**: Safe consecutive sequence IDs for `patientId` and `doctorId` using atomic MongoDB counter collection.
- **Dynamic Age Calculation**: Derives patient age dynamically from Unix DOB timestamp or falls back to entered age.
- **Smart Volunteer Auto-Credentials**: Auto-generates username (`firstname.lastname.mobile@volunteer`) and initial password (`Full Name`) when credentials are omitted.
- **Flexible Header & Query Pagination**: Supports pagination via custom headers (`limit`, `page`) as specified, as well as query parameters (`?limit=10&page=1`).

---

## 📁 Project Structure

```
ngo/
├── ngo-fe/               # Frontend applications
└── ngo-be/               # Backend API service
    ├── src/
    │   ├── config/
    │   │   ├── db.ts               # MongoDB Atlas connection pool
    │   │   └── redis.ts            # Redis client with in-memory fallback
    │   ├── models/
    │   │   ├── Counter.ts          # Atomic sequence generator
    │   │   ├── User.ts             # User model with UUID & Bcrypt
    │   │   ├── Department.ts       # Medical departments
    │   │   ├── Pharmacy.ts         # Medicine inventory & stock
    │   │   ├── Diagnosis.ts        # Diagnostic investigations
    │   │   ├── Doctor.ts           # Doctors with sequential doctorId
    │   │   ├── Patient.ts          # Patients with vitals and workflow flags
    │   │   ├── PrescribeMeds.ts    # Dispensed medications
    │   │   ├── PrescribeTest.ts    # Prescribed diagnostic tests
    │   │   └── Referral.ts         # Tertiary care referrals
    │   ├── middlewares/
    │   │   ├── auth.ts             # JWT authentication & RBAC
    │   │   ├── pagination.ts       # Header & query pagination extractor
    │   │   ├── rateLimiter.ts      # High-throughput DDoS protection
    │   │   └── errorHandler.ts     # Centralized error handler
    │   ├── controllers/            # Dedicated business logic controllers
    │   ├── routes/
    │   │   ├── unauthRoutes.ts     # Public counter endpoints
    │   │   ├── authRoutes.ts       # Auth endpoints
    │   │   └── [domain]Routes.ts   # Authenticated RBAC endpoints
    │   ├── services/
    │   │   └── cacheService.ts
    │   ├── utils/
    │   │   ├── ageCalculator.ts    # DOB timestamp to age converter
    │   │   └── volunteerHelper.ts  # Auto-credential generator
    │   ├── app.ts                  # Express application setup
    │   └── server.ts               # HTTP server entrypoint
    ├── tests/
    │   ├── api_test.js             # End-to-end camp flow test
    │   └── load_test.js            # Autocannon 100+ req/s load test
    ├── package.json
    └── tsconfig.json
```

---

## 🔄 End-to-End Camp Flow Mapping

| Counter / Web App | Domain | Method & Route | Description |
|---|---|---|---|
| **Registration Desk** | `register.pragatifoundation.com` | `POST /api/v1/unauth/patients` | Registers patient, auto-generates sequential `patientId`, and calculates age from DOB. |
| **Vitals Station** | `vitals.pragatifoundation.com` | `GET /api/v1/unauth/patients/:id`<br>`PATCH /api/v1/unauth/patients/:id` | Searches by `patientId` number (or UUID); patches vitals (BP, pulse, temp, spo2, weight, height). |
| **Waiting Area** | `profile.pragatifoundation.com` | `GET /api/v1/unauth/doctors`<br>`PATCH /api/v1/unauth/patients/:id` | Lists available doctors by department; assigns `doctorId` to patient profile once doctor is available. |
| **Doctor Counter** | Consultation Station | Doctor Examines | Doctor prescribes Meds, Tests, or Referrals. |
| **Referral Desk** | `referral.pragatifoundation.com` | `POST /api/v1/unauth/referrals` | Records referral description & details (Adhaar, PAN, follow-up timeline); marks `hasReferral: true` on patient. |
| **Tests Counter** | `tests.pragatifoundation.com` | `POST /api/v1/unauth/tests` | Records investigations carried out; marks `hasTest: true` on patient. |
| **Pharmacy / Meds** | `meds.pragatifoundation.com` | `POST /api/v1/unauth/meds` | Dispenses prescribed medicines; decrements pharmacy inventory; marks `hasMeds: true` on patient. |
| **Exit Feedback** | Exit Desk | `PATCH /api/v1/unauth/patients/:id` | Optional patient rating (1-10) before departure. |

---

## 🛠️ API Reference

**Base URI**: `https://api.pragatifoundation.com/api/v1`

### 1. Public Counter Endpoints (No JWT required)

#### `POST /unauth/patients`
Registers a new patient.
- **Payload**:
  ```json
  {
    "name": "Salman Ansari",
    "dob": 806437800000,
    "mobile": 9998889898,
    "gender": "MALE",
    "department": "17f37e1f-32b9-47ed-85de-09b5f9ec1411",
    "complaint": "facing slight pain in chest from 2 days",
    "author": "a7b8c9-uuid-of-volunteer"
  }
  ```
- **Response**:
  ```json
  {
    "success": true,
    "message": "Patient registered successfully.",
    "data": {
      "id": "uuid",
      "patientId": 1,
      "name": "Salman Ansari",
      "age": 31,
      "dob": 806437800000,
      "mobile": 9998889898,
      "gender": "MALE",
      "complaint": "facing slight pain in chest from 2 days",
      "department": "17f37e1f-32b9-47ed-85de-09b5f9ec1411",
      "author": "a7b8c9-uuid-of-volunteer",
      "hasTest": false,
      "hasMeds": false,
      "hasReferral": false,
      "created": 1729340000000,
      "updated": 1729340000000
    }
  }
  ```

#### `GET /unauth/patients/:id`
Lookup patient by either sequential numeric `patientId` (e.g. `1`) or UUID `id`.

#### `PATCH /unauth/patients/:id`
Updates vitals, assigns doctor, or updates exit ratings.
- **Payload**:
  ```json
  {
    "vitals": {
      "bp": "120/80",
      "pulse": 72,
      "tempreture": 98.6,
      "spo2": 99,
      "weight": 70,
      "height": 175
    },
    "doctorId": 1,
    "ratings": 10
  }
  ```

#### `GET /unauth/doctors`
Fetch active doctors list for waiting area selection.

#### `POST /unauth/referrals`
- **Payload**:
  ```json
  {
    "patientId": 1,
    "doctorId": 1,
    "description": "Need Bypass Surgery",
    "details": "Follow up within 10 days. Adhaar: 123456781234, PAN: 12345678"
  }
  ```

#### `POST /unauth/meds`
- **Payload**:
  ```json
  {
    "data": [{ "id": "pharmacy-uuid", "qty": 10 }],
    "patientId": 1
  }
  ```

#### `POST /unauth/tests`
- **Payload**:
  ```json
  {
    "data": ["diagnosis-uuid"],
    "patientId": 1
  }
  ```

---

### 2. Authentication & User Endpoints

#### `POST /auth/register` (or `POST /users`)
Auto-credentials for volunteer if username/password not provided:
- **Payload**:
  ```json
  { "name": "John Doe", "role": "VOLUNTEER", "mobile": 9990009090 }
  ```
- **Generated Username**: `john.doe.9990009090@volunteer`
- **Default Password**: `John Doe` (Bcrypt hashed)

#### `POST /auth/login`
- **Payload**: `{ "username": "john.doe.9990009090@volunteer", "password": "John Doe" }`
- **Returns**: JWT Bearer token valid for 7 days.

---

### 3. Private RBAC Endpoints (`Authorization: Bearer <token>`)

Supports pagination via headers (`limit: 10`, `page: 1`) or query params:

- **Users**: `POST /users`, `GET /users`, `GET /users/:id`, `PUT /users/:id`, `DELETE /users/:id`
- **Departments**: `POST /departments`, `GET /departments`, `GET /departments/:id`, `PUT /departments/:id`, `DELETE /departments/:id`
- **Pharmacy**: `POST /pharmacy`, `GET /pharmacy`, `GET /pharmacy/:id`, `PATCH /pharmacy/:id` (headers or body `{ qty: 10 }`), `PUT /pharmacy/:id`, `DELETE /pharmacy/:id`
- **Diagnosis**: `POST /diagnosis`, `GET /diagnosis`, `GET /diagnosis/:id`, `PUT /diagnosis/:id`, `DELETE /diagnosis/:id`
- **Doctors**: `POST /doctors`, `GET /doctors`, `GET /doctors/:id`, `PUT /doctors/:id`, `DELETE /doctors/:id`
- **Patients**: `POST /patients`, `GET /patients`, `GET /patients/:id`, `PUT /patients/:id`, `DELETE /patients/:id`
- **Meds**: `POST /meds`, `GET /meds`, `GET /meds/:id`, `PUT /meds/:id`, `DELETE /meds/:id`
- **Tests**: `POST /tests`, `GET /tests`, `GET /tests/:id`, `PUT /tests/:id`, `DELETE /tests/:id`
- **Referrals**: `POST /referrals`, `GET /referrals`, `GET /referrals/:id`, `PUT /referrals/:id`, `DELETE /referrals/:id`

---

## ⚡ Setup & Execution

### 1. Install Dependencies
```bash
cd ngo-be
npm install
```

### 2. Environment Variables (.env)
```env
PORT=8000
NODE_ENV=development
MONGO_URI=mongodb+srv://zenansari0:ansari911@shams.4xcqxxp.mongodb.net/demo?appName=shams
JWT_SECRET=pragati_foundation_camp_jwt_secret_key_2026_super_secure
JWT_EXPIRES_IN=7d
REDIS_URL=redis://127.0.0.1:6379
ROUTE_PREFIX=/api/v1
CORS_ORIGIN=*
```

### 3. Build & Run
```bash
# Development (with hot-reload)
npm run dev

# Build TypeScript to dist/
npm run build

# Start Production Server
npm start
```

### 4. Run Integration Tests & Load Benchmark
```bash
# Run 10-step camp flow integration test
npm run test:api

# Run Autocannon load test (benchmarks req/sec and latency)
npm run test:load
```
