# ElevateHR — Premium HR Management Platform

> A production-grade, full-stack Human Resource Management System built with **Next.js 16**, **MongoDB Atlas**, and **Tailwind CSS 4**. Manage your workforce, track attendance, oversee payroll, and generate executive reports — all from a single, beautifully designed interface.

---

## ✨ Features

### 🏠 Executive Dashboard
- **Live workforce statistics** — Total employees, active headcount, attendance rate, present/absent/unmarked counts for today
- **7-day attendance trend** — Bar/line chart rendered with Recharts showing present vs. absent over the last week
- **Workforce distribution** — Pie chart breaking down employee count by department
- **Operational alerts** — Real-time cards for absent employees and unmarked attendance, with urgency badges
- **Recently joined** — A live feed of the last 5 new employees with their role, department, and join date
- **Quick actions** — One-click navigation to Add Employee, Verify Compliance, and Generate Reports
- **Sparkline indicators** — Inline micro-charts on each KPI card showing historical trend

### 👥 Team Directory (Employee Management)
- **Paginated employee list** — Server-side pagination (configurable page size, max 100 per page)
- **Global search** — Instant full-text search across name, email, department, designation, and employee ID
- **Department filter** — Filter by any of the 10 defined departments
- **Status filter** — Filter by active / inactive / probation / on leave
- **Add employee** — Modal form with full validation (required fields, email format, duplicate ID/email check)
- **Edit employee** — Inline editing of all employee fields
- **Delete employee** — Single and bulk delete support
- **Bulk upload** — Import multiple employees at once via the bulk API endpoint
- **Employee detail page** — Dedicated profile page at `/employee/[id]` with full record view

### 📅 Attendance Tracking
- **Date-range picker** — View attendance across any date range (API enforces a 7-day window per request)
- **Column-based view** — Each employee shown as a row; date columns show present / absent / unmarked status
- **One-click upsert** — Click any cell to toggle between `present`, `absent`, and `unmarked` (saved immediately via PUT API)
- **Search & filter** — Search by name, email, ID, department, or designation
- **Pagination** — Handles large workforces with cursor-based pagination

### 💰 Payroll Management
- **Payroll roster** — Full employee table with base salary, department, employment type, and tax compliance status
- **Summary KPIs** — Total monthly payroll liability, verified disbursement rate, average gross salary
- **Live search** — Debounced search (300 ms) by name, ID, or department — refreshes payroll table in real time
- **PDF export** — One-click export of the full projected payroll report as a professionally formatted PDF (via jsPDF), with auto-pagination for large rosters

### 📊 Executive Reports
- **Attendance engagement chart** — 7-day present vs. absent trend (re-uses shared AttendanceTrend component)
- **Workforce distribution chart** — Department breakdown pie chart
- **PDF export** — Export full workforce inventory report (name, department, status) as a PDF

### ⚙️ Settings
- Company name, logo, and address configuration
- Tax percentage and allowances percentage (used for payroll calculations)
- Persisted in MongoDB with timestamps

---

## 🗂 Project Structure

```
hrms-main/
├── app/
│   ├── api/
│   │   ├── attendance/       # GET (date range, paginated), PUT (upsert)
│   │   └── employees/
│   │       ├── route.ts      # GET (search/filter/paginate), POST (create)
│   │       ├── [id]/         # GET, PUT, DELETE single employee
│   │       ├── bulk/         # POST bulk create
│   │       ├── bulk-delete/  # POST bulk delete
│   │       └── check-id/     # GET check if employee ID is available
│   ├── dashboard/            # Executive Dashboard page
│   ├── attendance/           # Attendance Tracker page
│   ├── employee/[id]/        # Employee detail/profile page
│   ├── payroll/              # Payroll Management page
│   ├── reports/              # Executive Reports page
│   ├── layout.tsx            # Root layout (Sidebar, Navbar, Toaster, AuthProvider)
│   └── page.tsx              # Home → Team Directory
├── components/
│   ├── dashboard/            # Sparkline, AttendanceTrend, DepartmentDistribution, AttendanceSummary
│   ├── employee/             # EmployeeList, EmployeeForm, EmployeeCard
│   ├── global/               # Sidebar, Navbar, CommandSearch
│   ├── providers/            # ThemeProvider, AuthProvider
│   └── ui/                   # Skeleton, Sonner (toast)
├── config/
│   └── mongodb.ts            # Mongoose connection with serverless-safe caching
├── lib/
│   ├── departments.ts        # 10 departments + color tokens
│   ├── roles.ts              # 16 designation types
│   ├── constants.ts          # App branding & UI constants
│   └── utils.ts              # Shared utilities
├── models/
│   ├── Employee.ts           # Mongoose schema (15+ fields, indexed)
│   ├── Attendance.ts         # Attendance schema (unique per employee+date)
│   ├── Setting.ts            # Company settings schema
│   └── User.ts               # User/auth schema
├── services/
│   ├── employeeService.ts    # Client-side API wrapper for employee endpoints
│   └── attendanceService.ts  # Client-side API wrapper for attendance endpoints
├── scripts/
│   ├── seed-data.ts          # Seeds 55 realistic employees + attendance records
│   └── seed.ts               # Role update seed script
├── public/                   # SVGs, logos, fonts
├── vercel.json               # Vercel deployment config (region, security headers)
├── next.config.ts            # Next.js config (strict mode, image optimization)
└── .env.example              # Environment variable reference
```

---

## 🗄 Data Models

### Employee
| Field | Type | Notes |
|---|---|---|
| `id` | Number | Unique numeric ID |
| `employeeId` | String | e.g. `EMP-001`, unique |
| `name` | String | Trimmed |
| `email` | String | Lowercase, unique |
| `department` | Enum | 10 departments |
| `designation` | String | Free text |
| `phone` | String | Optional |
| `joiningDate` | Date | Defaults to now |
| `status` | Enum | `active` / `inactive` / `probation` / `on leave` |
| `role` | Enum | `Admin` / `HR Manager` / `Employee` |
| `employmentType` | Enum | `Full-time` / `Part-time` / `Contract` |
| `salary` | Number | Optional, USD |
| `emergencyContact` | Object | name, phone, relation |
| `address` | String | Optional |

### Attendance
| Field | Type | Notes |
|---|---|---|
| `employee` | ObjectId | Ref: Employee |
| `date` | Date | Normalized to midnight UTC |
| `status` | Enum | `present` / `absent` / `unmarked` |
| `note` | String | Max 200 chars |

**Indexes:** Unique compound index on `(employee, date)` · Range index on `(date, status)`

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- A [MongoDB Atlas](https://www.mongodb.com/atlas) cluster (free tier works)

### 1. Clone & Install

```bash
git clone https://github.com/Ayush-1-7/Py_HRMS.git
cd Py_HRMS/hrms-main
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env.local
```

Edit `.env.local`:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@cluster0.mongodb.net/hrms?retryWrites=true&w=majority
```

### 3. Seed the Database (Optional)

Populate 55 realistic employees and attendance records:

```bash
npx ts-node --project tsconfig.json scripts/seed-data.ts
```

### 4. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🌐 API Reference

### Employees

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/employees` | List employees (paginated, search, filter) |
| `POST` | `/api/employees` | Create new employee |
| `GET` | `/api/employees/[id]` | Get single employee |
| `PUT` | `/api/employees/[id]` | Update employee |
| `DELETE` | `/api/employees/[id]` | Delete employee |
| `POST` | `/api/employees/bulk` | Bulk create employees |
| `POST` | `/api/employees/bulk-delete` | Bulk delete employees |
| `GET` | `/api/employees/check-id` | Check if an employee ID is available |

**Query params for `GET /api/employees`:**
- `page` — Page number (default: 1)
- `pageSize` — Results per page (default: 20, max: 100)
- `search` — Full-text search across name, email, department, designation, employeeId
- `status` — Filter by status (`active`, `inactive`, `probation`, `on leave`)
- `keyword` — Filter by department name

### Attendance

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/attendance` | Get attendance grid (employees + date columns) |
| `PUT` | `/api/attendance` | Upsert a single attendance record |

**Query params for `GET /api/attendance`:**
- `from` — Start date `YYYY-MM-DD` (default: today)
- `to` — End date `YYYY-MM-DD` (clamped to 7 days from `from`)
- `page`, `pageSize`, `search`, `status` — Same as employees

**Body for `PUT /api/attendance`:**
```json
{ "employeeId": "<ObjectId>", "date": "YYYY-MM-DD", "status": "present|absent|unmarked", "note": "..." }
```

### Settings

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/settings` | Fetch company settings (auto-creates defaults) |
| `POST` | `/api/settings` | Update company settings |

---

## ☁️ Deploy to Vercel

This project is pre-configured for Vercel with `vercel.json` (Mumbai region, security headers).

1. Push to GitHub
2. Import the repo at [vercel.com/new](https://vercel.com/new)
3. Add the environment variable in **Vercel Dashboard → Settings → Environment Variables**:
   - `MONGODB_URI` = your MongoDB Atlas connection string
4. Deploy — Vercel auto-detects Next.js

> **MongoDB Atlas note:** Make sure to whitelist all IPs (`0.0.0.0/0`) in Atlas Network Access, since Vercel uses dynamic IPs.

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| Database | MongoDB Atlas (Mongoose 9) |
| Styling | Tailwind CSS 4 + Custom CSS Variables |
| Charts | Recharts 3 + react-minimal-pie-chart |
| PDF Export | jsPDF 4 |
| Toast Notifications | Sonner |
| Icons | react-icons (Ionicons 5) |
| Auth | jose (JWT), bcryptjs |
| Deployment | Vercel |

---

## 📦 Departments & Roles

**10 Departments:** Engineering · Marketing · Sales · Human Resources · Finance · Operations · Design · Product · Legal · Customer Support

**16 Designations:** Software Engineer · Senior Software Engineer · Lead Engineer · Product Manager · Product Designer · UI/UX Designer · HR Manager · HR Specialist · Sales Executive · Account Manager · Marketing Specialist · Content Strategist · Operations Manager · QA Analyst · DevOps Engineer · Data Scientist

---

## 📄 License

MIT — feel free to use, fork, and build on this project.
