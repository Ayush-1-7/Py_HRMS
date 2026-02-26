import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Employee from "../models/Employee";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

async function seed() {
    try {
        await mongoose.connect(MONGODB_URI as string);
        console.log("Connected to MongoDB");

        const employees = await Employee.find({});
        console.log(`Found ${employees.length} employees`);

        const defaultPassword = await bcrypt.hash("welcome123", 10);

        for (const emp of employees) {
            // make the first employee an Admin if no admins exist, otherwise just update everyone
            const isFirst = emp.id === 1; // Or any logic
            emp.role = isFirst ? "Admin" : "Employee";
            emp.password = defaultPassword;
            await emp.save();
            console.log(`Updated employee: ${emp.email} with role ${emp.role}`);
        }

        console.log("Seed complete. Disconnecting...");
        await mongoose.disconnect();
    } catch (error) {
        console.error("Seed error:", error);
        process.exit(1);
    }
}

seed();
