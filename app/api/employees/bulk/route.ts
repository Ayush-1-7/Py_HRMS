import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/mongodb";
import Employee from "@/models/Employee";

// POST /api/employees/bulk — create multiple employees
export async function POST(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();

    if (!Array.isArray(body)) {
      return NextResponse.json(
        { success: false, message: "Request body must be an array of employees" },
        { status: 400 }
      );
    }

    if (body.length === 0) {
      return NextResponse.json(
        { success: false, message: "Array cannot be empty" },
        { status: 400 }
      );
    }

    /* Validate all records upfront */
    const errors: string[] = [];
    for (let i = 0; i < body.length; i++) {
      const emp = body[i];
      if (!emp.id || !emp.name || !emp.email || !emp.department) {
        errors.push(
          `Row ${i + 1}: id, name, email, and department are required`
        );
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { success: false, message: errors.join("; ") },
        { status: 400 }
      );
    }

    /* Check for duplicate IDs within the batch */
    const ids = body.map((e: { id: string }) => e.id);
    if (new Set(ids).size !== ids.length) {
      return NextResponse.json(
        { success: false, message: "Duplicate employee IDs in batch" },
        { status: 400 }
      );
    }

    /* Check for existing IDs in database */
    const existingIds = await Employee.find(
      { id: { $in: ids.map((id: string) => Number(id)) } },
      { id: 1 }
    ).lean();
    if (existingIds.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message: `Employee IDs already exist: ${existingIds.map((e) => e.id).join(", ")}`,
        },
        { status: 409 }
      );
    }

    /* Format and insert */
    const formatted = body.map((emp: any) => ({
      id: emp.id,
      name: emp.name?.trim(),
      email: emp.email?.trim().toLowerCase(),
      department: emp.department?.trim(),
      designation: emp.designation?.trim() ?? "",
      phone: emp.phone?.trim(),
      joiningDate: emp.joiningDate ? new Date(emp.joiningDate) : new Date(),
      status: emp.status ?? "active",
    }));

    const created = await Employee.insertMany(formatted);

    return NextResponse.json(
      {
        success: true,
        data: created,
        message: `${created.length} employee(s) created`,
      },
      { status: 201 }
    );
  } catch (error: unknown) {
    console.error("[POST /api/employees/bulk]", error);
    const isDuplicate =
      typeof error === "object" &&
      error !== null &&
      (error as { code?: number }).code === 11000;
    return NextResponse.json(
      {
        success: false,
        message: isDuplicate
          ? "Duplicate email or ID found"
          : "Failed to create employees",
      },
      { status: isDuplicate ? 409 : 500 }
    );
  }
}
