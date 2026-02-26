import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/mongodb";
import Employee from "@/models/Employee";

// GET /api/employees/check-id?id=123
export async function GET(req: NextRequest) {
  try {
    await connectDB();
    const { searchParams } = new URL(req.url);
    const raw = searchParams.get("id");

    if (!raw) {
      return NextResponse.json(
        { exists: false, message: "id query param is required" },
        { status: 400 }
      );
    }

    const id = Number(raw);
    if (isNaN(id)) {
      return NextResponse.json(
        { exists: false, message: "id must be a number" },
        { status: 400 }
      );
    }

    const found = await Employee.exists({ id });
    return NextResponse.json({ exists: !!found });
  } catch (error) {
    console.error("[GET /api/employees/check-id]", error);
    return NextResponse.json(
      { exists: false, message: "Check failed" },
      { status: 500 }
    );
  }
}
