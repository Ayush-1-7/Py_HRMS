import { NextRequest, NextResponse } from "next/server";
import Setting from "@/models/Setting";
import dbConnect from "@/lib/db";

export async function GET() {
    try {
        await dbConnect();
        let settings = await Setting.findOne();
        if (!settings) {
            settings = await Setting.create({
                companyName: "NovaHR Enterprise",
                taxPercentage: 10,
                allowancesPercentage: 5
            });
        }
        return NextResponse.json(settings);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        // Auth check disabled
        /*
        const session = await getSession();
        if (!session || session.user.role !== "admin") {
            return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
        }
        */

        const body = await req.json();
        await dbConnect();

        let settings = await Setting.findOne();
        if (settings) {
            settings = await Setting.findByIdAndUpdate(settings._id, { ...body, updatedBy: "system" }, { new: true });
        } else {
            settings = await Setting.create({ ...body, updatedBy: "system" });
        }

        return NextResponse.json(settings);
    } catch (err: any) {
        return NextResponse.json({ error: err.message }, { status: 500 });
    }
}
