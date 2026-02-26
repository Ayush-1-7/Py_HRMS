import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import Employee from "../models/Employee";
import Attendance from "../models/Attendance";
import dotenv from "dotenv";
import { DEPARTMENTS } from "../lib/departments";

dotenv.config({ path: ".env.local" });

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
}

const firstNames = [
    "Aaron", "Abigail", "Adam", "Adrian", "Aishi", "Alaric", "Alex", "Alexander", "Alice", "Alicia",
    "Alina", "Alisha", "Alok", "Amara", "Amelia", "Amit", "Amrita", "Ananya", "Andrew", "Anita",
    "Anjali", "Ankit", "Anshul", "Anthony", "Anubhav", "Anya", "Arav", "Archana", "Ari", "Arjun",
    "Armaan", "Arnav", "Arpita", "Artir", "Arun", "Arya", "Aryan", "Asher", "Ashley", "Ashwin",
    "Aurora", "Austin", "Avani", "Awan", "Ayush", "Bella", "Benjamin", "Bharat", "Bhavna", "Blake"
];

const lastNames = [
    "Agarwal", "Anderson", "Arora", "Baker", "Bansal", "Bhatia", "Brown", "Chakraborty", "Chauhan", "Clark",
    "Das", "Davies", "Dutta", "Evans", "Garg", "Goel", "Gupta", "Hall", "Harris", "Iyer",
    "Jackson", "Jain", "Johnson", "Jones", "Joshi", "Kapoor", "Kaur", "Khan", "Khanna", "Kumar",
    "Madan", "Malhotra", "Mehra", "Mehta", "Miller", "Mishra", "Mittal", "Mukherjee", "Nair", "Pandey",
    "Patel", "Pillai", "Prasad", "Rai", "Rajput", "Rao", "Reddy", "Saini", "Saksena", "Sarma"
];

const designations: Record<string, string[]> = {
    Engineering: ["Software Engineer", "Senior Software Engineer", "DevOps Engineer", "Frontend Developer", "Backend Developer", "Full Stack Developer", "QA Engineer", "Engineering Manager", "CTO"],
    Marketing: ["Marketing Specialist", "Content Writer", "SEO Analyst", "Marketing Manager", "Brand Designer", "Social Media Coordinator", "Chief Marketing Officer"],
    Sales: ["Sales Associate", "Account Manager", "Sales Executive", "Business Development Manager", "Sales Director", "Regional Sales Manager"],
    "Human Resources": ["HR Coordinator", "Talent Acquisition Specialist", "HR Manager", "Benefits Administrator", "Chief People Officer"],
    Finance: ["Accountant", "Financial Analyst", "Finance Manager", "Auditor", "CFO", "Tax Consultant"],
    Operations: ["Operations Coordinator", "Operations Manager", "Supply Chain Analyst", "Logistics Manager", "COO"],
    Design: ["UI Designer", "UX Designer", "Product Designer", "Graphic Designer", "Creative Director"],
    Product: ["Associate Product Manager", "Product Manager", "Senior Product Manager", "Product Owner", "VP of Product"],
    Legal: ["Legal Assistant", "Counsel", "Compliance Officer", "General Counsel"],
    "Customer Support": ["Support Specialist", "Customer Success Manager", "Technical Support Engineer", "Team Lead - Support"]
};

async function seed() {
    try {
        console.log("Connecting to MongoDB...");
        await mongoose.connect(MONGODB_URI as string);
        console.log("Connected to MongoDB");

        // Clear existing data
        console.log("Cleaning up existing collections...");
        await Employee.deleteMany({});
        await Attendance.deleteMany({});
        console.log("Cleaned up collections.");

        const defaultPassword = await bcrypt.hash("welcome123", 10);
        const employeesData = [];

        console.log("Generating 55 realistic employees...");
        for (let i = 1; i <= 55; i++) {
            const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
            const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];
            const name = `${firstName} ${lastName}`;
            const email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${i}@novahr.com`;

            const deptKeys = Object.keys(designations);
            const department = deptKeys[Math.floor(Math.random() * deptKeys.length)] as any;
            const deptDesignations = designations[department];
            const designation = deptDesignations[Math.floor(Math.random() * deptDesignations.length)];

            const statusPool: ("active" | "inactive" | "probation" | "on leave")[] = ["active", "active", "active", "probation", "on leave"];
            const status = statusPool[Math.floor(Math.random() * statusPool.length)];

            const employmentTypePool: ("Full-time" | "Part-time" | "Contract")[] = ["Full-time", "Full-time", "Full-time", "Part-time", "Contract"];
            const employmentType = employmentTypePool[Math.floor(Math.random() * employmentTypePool.length)];

            const role = (i === 1) ? "Admin" : (i <= 5 ? "HR Manager" : "Employee");

            employeesData.push({
                id: i,
                employeeId: `EMP-${i.toString().padStart(3, '0')}`,
                name,
                email,
                department,
                designation,
                phone: `+91 ${Math.floor(7000000000 + Math.random() * 3000000000)}`,
                joiningDate: new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 365 * 2)), // Join in last 2 years
                status,
                role,
                password: defaultPassword,
                employmentType,
                salary: Math.floor(30000 + Math.random() * 120000),
                address: `${Math.floor(Math.random() * 999)} Street, City Name, State`,
                emergencyContact: {
                    name: "Emergency Contact",
                    phone: "+91 9999999999",
                    relation: "Family"
                }
            });
        }

        const createdEmployees = await Employee.insertMany(employeesData);
        console.log(`Successfully created ${createdEmployees.length} employees.`);

        // Generate some attendance data for the last 7 days
        console.log("Generating attendance data...");
        const attendanceData = [];
        const today = new Date();
        today.setUTCHours(0, 0, 0, 0);

        for (let d = 0; d < 7; d++) {
            const date = new Date(today);
            date.setUTCDate(today.getUTCDate() - d);

            for (const emp of createdEmployees) {
                // Randomly skip some days or mark as absent/present
                const rand = Math.random();
                const status = rand > 0.15 ? "present" : (rand > 0.05 ? "absent" : "unmarked");

                attendanceData.push({
                    employee: emp._id,
                    date,
                    status,
                    note: status === "absent" ? "Not feeling well" : ""
                });
            }
        }

        await Attendance.insertMany(attendanceData);
        console.log(`Successfully created ${attendanceData.length} attendance records.`);

        console.log("Seeding complete. Disconnecting...");
        await mongoose.disconnect();
    } catch (error) {
        console.error("Seed error:", error);
        process.exit(1);
    }
}

seed();
