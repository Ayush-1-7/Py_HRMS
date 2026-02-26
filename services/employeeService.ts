import type { IEmployee } from "@/models/Employee";

/* ──────────────────────────────────────────────────────────
   Types
────────────────────────────────────────────────────────── */
export type EmployeePayload = {
  id: number;
  employeeId?: string;
  name: string;
  email: string;
  department: string;
  designation: string;
  salary?: number;
  employmentType?: "full-time" | "part-time" | "contract" | "intern";
  phone?: string;
  joiningDate?: string;
  status?: "active" | "inactive" | "probation" | "on leave";
};

export type Pagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type ApiResponse<T = unknown> =
  | { success: true; data: T; pagination?: Pagination; message?: string }
  | { success: false; message: string };

/* ──────────────────────────────────────────────────────────
   GET employees — paginated
────────────────────────────────────────────────────────── */
export async function fetchEmployees(
  page = 1,
  pageSize = 20,
  status?: string,
  search?: string,
  keyword?: string
): Promise<{ data: IEmployee[]; pagination: Pagination }> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
    ...(status ? { status } : {}),
    ...(search ? { search } : {}),
    ...(keyword ? { keyword } : {}),
  });
  const res = await fetch(`/api/employees?${params}`, { cache: "no-store" });
  const json: ApiResponse<IEmployee[]> = await res.json();
  if (!json.success) throw new Error((json as { success: false; message: string }).message);
  const ok = json as { success: true; data: IEmployee[]; pagination: Pagination };
  return { data: ok.data, pagination: ok.pagination! };
}

/* ──────────────────────────────────────────────────────────
   GET all employees (no pagination — for dropdowns, etc.)
────────────────────────────────────────────────────────── */
export async function fetchAllEmployees(): Promise<IEmployee[]> {
  const { data } = await fetchEmployees(1, 100);
  return data;
}

/* ──────────────────────────────────────────────────────────
   GET single employee by mongo _id
────────────────────────────────────────────────────────── */
export async function fetchEmployeeById(mongoId: string): Promise<IEmployee> {
  const res = await fetch(`/api/employees/${mongoId}`, { cache: "no-store" });
  const json: ApiResponse<IEmployee> = await res.json();
  if (!json.success) throw new Error(json.message);
  return (json as { success: true; data: IEmployee }).data;
}

/* ──────────────────────────────────────────────────────────
   Check if employee ID already exists (for debounced check)
────────────────────────────────────────────────────────── */
export async function checkEmployeeIdExists(
  id: number
): Promise<{ exists: boolean; message?: string }> {
  const res = await fetch(`/api/employees/check-id?id=${id}`);
  const json = await res.json();
  return json;
}

/* ──────────────────────────────────────────────────────────
   POST — create employee
────────────────────────────────────────────────────────── */
export async function createEmployee(
  payload: EmployeePayload
): Promise<IEmployee> {
  const res = await fetch("/api/employees", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResponse<IEmployee> = await res.json();
  if (!json.success) throw new Error(json.message);
  return (json as { success: true; data: IEmployee }).data;
}

/* ──────────────────────────────────────────────────────────
   PUT — edit employee (by numeric id field)
────────────────────────────────────────────────────────── */
export async function updateEmployee(
  mongoId: string,
  payload: Partial<EmployeePayload>
): Promise<IEmployee> {
  const res = await fetch(`/api/employees/${mongoId}`, {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const json: ApiResponse<IEmployee> = await res.json();
  if (!json.success) throw new Error(json.message);
  return (json as { success: true; data: IEmployee }).data;
}

/* ──────────────────────────────────────────────────────────
   DELETE — single employee by mongo _id
────────────────────────────────────────────────────────── */
export async function deleteEmployee(mongoId: string): Promise<void> {
  const res = await fetch(`/api/employees/${mongoId}`, {
    method: "DELETE",
  });
  const json: ApiResponse = await res.json();
  if (!json.success) throw new Error(json.message);
}

/* ──────────────────────────────────────────────────────────
   DELETE — bulk delete by array of mongo _ids
────────────────────────────────────────────────────────── */
export async function bulkDeleteEmployees(mongoIds: string[]): Promise<void> {
  const res = await fetch("/api/employees/bulk-delete", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ids: mongoIds }),
  });
  const json: ApiResponse = await res.json();
  if (!json.success) throw new Error(json.message);
}
