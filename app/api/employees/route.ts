import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/mongodb";
import Employee from "@/models/Employee";

// GET /api/employees?page=1&pageSize=20&status=active
export async function GET(req: NextRequest) {
  try {
    await connectDB();

    const { searchParams } = new URL(req.url);
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1"));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get("pageSize") ?? "20")));
    const status = searchParams.get("status"); // optional filter
    const search = searchParams.get("search")?.trim();
    const keyword = searchParams.get("keyword")?.trim(); // department filter

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const matchStage: Record<string, any> = {};
    if (status) matchStage.status = status;
    if (keyword) matchStage.department = keyword;
    if (search) {
      const regex = { $regex: search, $options: "i" };
      matchStage.$or = [
        { name: regex },
        { email: regex },
        { department: regex },
        { designation: regex },
        { employeeId: regex },
      ];
    }

    const [result] = await Employee.aggregate([
      { $match: matchStage },
      { $sort: { id: 1 } },
      {
        $facet: {
          metadata: [{ $count: "total" }],
          data: [
            { $skip: (page - 1) * pageSize },
            { $limit: pageSize },
          ],
        },
      },
    ]);

    const total = result.metadata[0]?.total ?? 0;
    const totalPages = Math.ceil(total / pageSize);

    return NextResponse.json({
      success: true,
      data: result.data,
      pagination: { page, pageSize, total, totalPages },
    });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch employees" },
      { status: 500 }
    );
  }
}

// POST /api/employees — add a new employee
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { id, name, email, department, designation, phone, joiningDate, status } = body;

    // 1. Required fields
    if (!id || !name || !email || !department || !designation) {
      return NextResponse.json(
        { success: false, message: "Missing required fields (id, name, email, department, designation)" },
        { status: 400 }
      );
    }

    // 2. Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, message: "Invalid email format" },
        { status: 400 }
      );
    }

    // 3. Duplicate checks
    const [idExists, emailExists] = await Promise.all([
      Employee.exists({ id }),
      Employee.exists({ email: email.toLowerCase() })
    ]);

    if (idExists) {
      return NextResponse.json(
        { success: false, message: `Conflict: Employee ID ${id} is already taken` },
        { status: 409 }
      );
    }
    if (emailExists) {
      return NextResponse.json(
        { success: false, message: "Conflict: Email address is already registered" },
        { status: 409 }
      );
    }

    // 4. Create
    const employee = await Employee.create({
      id,
      employeeId: body.employeeId || `EMP-${id.toString().padStart(3, '0')}`,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      department,
      designation: designation.trim(),
      phone: phone?.trim(),
      joiningDate: joiningDate ? new Date(joiningDate) : new Date(),
      status: status ?? "active",
      salary: body.salary,
      employmentType: body.employmentType || "Full-time",
    });

    return NextResponse.json({
      success: true,
      message: "Employee registered successfully",
      data: employee
    }, { status: 201 });

  } catch (error: unknown) {
    if (error && typeof error === "object" && "name" in error && error.name === "ValidationError") {
      const msgs = Object.values((error as unknown as { errors: Record<string, { message: string }> }).errors || {}).map((e) => e.message).join(", ");
      return NextResponse.json({ success: false, message: msgs }, { status: 400 });
    }

    return NextResponse.json(
      { success: false, message: "Failed to add employee due to a server error" },
      { status: 500 }
    );
  }
}

