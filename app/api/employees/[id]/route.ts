import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/mongodb";
import Employee from "@/models/Employee";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/employees/[id] — fetch a single employee by mongo _id
export async function GET(_req: NextRequest, { params }: RouteContext) {
  try {
    await connectDB();
    const { id } = await params;
    const employee = await Employee.findById(id).lean();

    if (!employee) {
      return NextResponse.json(
        { success: false, message: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ success: true, data: employee });
  } catch {
    return NextResponse.json(
      { success: false, message: "Failed to fetch employee" },
      { status: 500 }
    );
  }
}

// PUT /api/employees/[id] — update an employee by mongo _id
export async function PUT(req: NextRequest, { params }: RouteContext) {
  try {
    await connectDB();
    const { id } = await params;
    const body = await req.json();

    // 1. Basic validation for payload (if provided)
    if (body.email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(body.email)) {
        return NextResponse.json(
          { success: false, message: "Invalid email format" },
          { status: 400 }
        );
      }
      body.email = body.email.toLowerCase().trim();
    }

    if (body.name) body.name = body.name.trim();
    if (body.designation) body.designation = body.designation.trim();

    // If 'id' field is being updated, ensure it's a number for the database query
    if (body.id !== undefined) {
      body.id = Number(body.id);
      if (isNaN(body.id)) {
        return NextResponse.json(
          { success: false, message: "Employee ID must be a number" },
          { status: 400 }
        );
      }
      // Check for existing IDs in database if a new ID is provided
      const existingEmployeeWithId = await Employee.findOne({ id: body.id, _id: { $ne: id } }).lean();
      if (existingEmployeeWithId) {
        return NextResponse.json(
          { success: false, message: "Conflict: This Employee ID is already in use" },
          { status: 409 }
        );
      }
    }

    // 2. Update
    const updated = await Employee.findByIdAndUpdate(id, body, {
      new: true,
      runValidators: true,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, message: "Employee not found or ID is invalid" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Employee updated successfully",
      data: updated
    });

  } catch (error: unknown) {
    const isDuplicate =
      typeof error === "object" &&
      error !== null &&
      (error as { code?: number }).code === 11000;

    if (isDuplicate) {
      const keyMatch = String(error).match(/index:\s(\w+)_/);
      const field = keyMatch?.[1] ?? "field";
      const friendly: Record<string, string> = {
        email: "Conflict: This email is already in use by another employee",
        id: "Conflict: This Employee ID is already in use",
      };
      return NextResponse.json(
        { success: false, message: friendly[field] ?? `Duplicate value for ${field}` },
        { status: 409 }
      );
    }

    if (error && typeof error === "object" && "name" in error && error.name === "ValidationError") {
      const msgs = Object.values((error as unknown as { errors: Record<string, { message: string }> }).errors || {}).map((e) => e.message).join(", ");
      return NextResponse.json({ success: false, message: msgs }, { status: 400 });
    }

    return NextResponse.json(
      { success: false, message: "Server error while updating employee profile" },
      { status: 500 }
    );
  }
}

// DELETE /api/employees/[id] — remove an employee by mongo _id
export async function DELETE(_req: NextRequest, { params }: RouteContext) {
  try {
    await connectDB();
    const { id } = await params;

    const deleted = await Employee.findByIdAndDelete(id);

    if (!deleted) {
      return NextResponse.json(
        { success: false, message: "Employee not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Employee deleted successfully",
    });
  } catch (error: unknown) {
    const isCastError =
      typeof error === "object" &&
      error !== null &&
      (error as { name?: string }).name === "CastError";

    return NextResponse.json(
      { success: false, message: isCastError ? "Invalid employee ID" : "Failed to delete employee" },
      { status: isCastError ? 400 : 500 }
    );
  }
}
