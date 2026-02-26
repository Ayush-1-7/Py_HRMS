import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/mongodb";
import Employee from "@/models/Employee";
import Attendance from "@/models/Attendance";
import mongoose from "mongoose";

/* ── helpers ─────────────────────────────────────────────── */
function toMidnightUTC(dateStr: string): Date {
  const d = new Date(dateStr);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function clampDays(from: Date, to: Date, max = 7): Date {
  const limit = new Date(from);
  limit.setUTCDate(limit.getUTCDate() + max - 1);
  return to > limit ? limit : to;
}

/* ── GET /api/attendance
   ?from=YYYY-MM-DD&to=YYYY-MM-DD&page=1&pageSize=20&status=active&search=name
   Returns paginated employee list each with their attendance records
   for the requested date range (max 7 days).
──────────────────────────────────────────────────────────── */
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);

    /* date range */
    const fromStr = searchParams.get("from") ?? new Date().toISOString().slice(0, 10);
    const toStr = searchParams.get("to") ?? fromStr;
    const fromDate = toMidnightUTC(fromStr);
    const toDate = toMidnightUTC(toStr);
    const clampedTo = clampDays(fromDate, toDate, 7);

    /* pagination */
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));

    /* optional employee status filter */
    const empStatus = searchParams.get("status");
    const empMatch: Record<string, unknown> = empStatus ? { status: empStatus } : {};

    /* search by multiple fields */
    const search = searchParams.get("search")?.trim() ?? "";
    if (search) {
      const regex = { $regex: search, $options: "i" };
      empMatch.$or = [
        { name: regex },
        { email: regex },
        { employeeId: regex },
        { department: regex },
        { designation: regex },
      ];
    }

    /* ── Stage 1: paginate employees with $facet ── */
    const [empResult] = await Employee.aggregate([
      { $match: empMatch },
      { $sort: { id: 1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          employees: [
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
          ],
        },
      },
    ]);

    const total = empResult.metadata[0]?.total ?? 0;
    const totalPages = Math.ceil(total / pageSize);
    const empDocs = empResult.employees as { _id: mongoose.Types.ObjectId }[];
    const empIds = empDocs.map((e) => e._id);

    /* ── Stage 2: fetch attendance for this page's employees in range ── */
    const attendanceRecords = await Attendance.find({
      employee: { $in: empIds },
      date: { $gte: fromDate, $lte: clampedTo },
    }).lean();

    /* index by employeeId → dateStr → record */
    const attendanceMap: Record<string, Record<string, { status: string; note?: string }>> = {};
    for (const rec of attendanceRecords) {
      const empId = String(rec.employee);
      const dateStr = rec.date.toISOString().slice(0, 10);
      if (!attendanceMap[empId]) attendanceMap[empId] = {};
      attendanceMap[empId][dateStr] = { status: rec.status, note: rec.note };
    }

    /* build date column list */
    const dates: string[] = [];
    const cur = new Date(fromDate);
    while (cur <= clampedTo) {
      dates.push(cur.toISOString().slice(0, 10));
      cur.setUTCDate(cur.getUTCDate() + 1);
    }

    /* attach attendance to each employee */
    const employees = empDocs.map((emp) => ({
      ...emp,
      attendance: attendanceMap[String(emp._id)] ?? {},
    }));

    return NextResponse.json({
      success: true,
      data: {
        employees,
        dates,
        pagination: { page, pageSize, total, totalPages },
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch attendance" },
      { status: 500 }
    );
  }
}

/* ── PUT /api/attendance
   Body: { employeeId, date, status, note? }
   Upserts a single attendance record.
──────────────────────────────────────────────────────────── */
export async function PUT(req: NextRequest) {
  try {
    await connectDB();

    const body = await req.json();
    const { employeeId, date, status, note } = body;

    // 1. Basic validation
    if (!employeeId || !date || !status) {
      return NextResponse.json(
        { success: false, message: "employeeId, date and status are required" },
        { status: 400 }
      );
    }

    // 2. Format validation (ObjectId & Date)
    if (!mongoose.Types.ObjectId.isValid(employeeId)) {
      return NextResponse.json(
        { success: false, message: "Invalid employee ID format" },
        { status: 400 }
      );
    }

    const normalizedDate = new Date(date);
    if (isNaN(normalizedDate.getTime())) {
      return NextResponse.json(
        { success: false, message: "Invalid date format" },
        { status: 400 }
      );
    }
    normalizedDate.setUTCHours(0, 0, 0, 0);

    // 3. Status validation
    const validStatuses = ["present", "absent", "unmarked"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, message: "Invalid status. Allowed: present, absent, unmarked" },
        { status: 400 }
      );
    }

    // 4. Existence check
    const employeeExists = await Employee.exists({ _id: employeeId });
    if (!employeeExists) {
      return NextResponse.json(
        { success: false, message: "Employee not found" },
        { status: 404 }
      );
    }

    // 5. Upsert
    const record = await Attendance.findOneAndUpdate(
      { employee: new mongoose.Types.ObjectId(employeeId), date: normalizedDate },
      { $set: { status, note: note || "" } },
      { upsert: true, new: true, setDefaultsOnInsert: true, runValidators: true }
    );

    return NextResponse.json({
      success: true,
      message: `Attendance marked as ${status}`,
      data: record
    });

  } catch {
    return NextResponse.json(
      { success: false, message: "Server error while updating attendance" },
      { status: 500 }
    );
  }
}
