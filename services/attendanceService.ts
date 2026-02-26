import type { AttendanceStatus } from "@/models/Attendance";

/* re-export so consumers only need to import from the service layer */
export type { AttendanceStatus };

/* ── types ───────────────────────────────────────────────── */
export type AttendanceRecord = {
  status: AttendanceStatus;
  note?: string;
};

/** Keyed by ISO date string (YYYY-MM-DD) */
export type EmployeeAttendance = Record<string, AttendanceRecord>;

export type AttendanceEmployee = {
  _id: string;
  id: number;
  employeeId: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  status: "active" | "inactive";
  attendance: EmployeeAttendance;
};

export type AttendancePagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type AttendanceListResponse = {
  employees: AttendanceEmployee[];
  dates: string[];
  pagination: AttendancePagination;
};

/* ── helpers ─────────────────────────────────────────────── */
async function handleResponse<T>(res: Response): Promise<T> {
  const json = await res.json();
  if (!json.success) throw new Error(json.message ?? "Request failed");
  return json.data as T;
}

/* ── GET attendance list (paginated) ─────────────────────── */
export async function fetchAttendance(
  from: string,
  to: string,
  page = 1,
  pageSize = 20,
  search = ""
): Promise<AttendanceListResponse> {
  const params = new URLSearchParams({
    from,
    to,
    page: String(page),
    pageSize: String(pageSize),
  });
  if (search) params.append("search", search);
  const res = await fetch(`/api/attendance?${params}`, { cache: "no-store" });
  return handleResponse<AttendanceListResponse>(res);
}

/* ── PUT upsert single attendance record ─────────────────── */
export async function markAttendance(
  employeeId: string,
  date: string,
  status: AttendanceStatus,
  note?: string
): Promise<void> {
  const res = await fetch("/api/attendance", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ employeeId, date, status, note }),
  });
  await handleResponse(res);
}
