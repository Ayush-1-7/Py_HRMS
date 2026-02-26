import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/mongodb";
import Employee from "@/models/Employee";

// DELETE /api/employees/bulk-delete — body: { ids: string[] }
export async function DELETE(req: NextRequest) {
  try {
    await connectDB();
    const body = await req.json();
    const { ids } = body as { ids?: string[] };

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json(
        { success: false, message: "Provide an array of employee ids to delete" },
        { status: 400 }
      );
    }

    const result = await Employee.deleteMany({ _id: { $in: ids } });

    return NextResponse.json({
      success: true,
      message: `${result.deletedCount} employee(s) deleted`,
    });
  } catch (error) {
    console.error("[DELETE /api/employees/bulk-delete]", error);
    return NextResponse.json(
      { success: false, message: "Bulk delete failed" },
      { status: 500 }
    );
  }
}
