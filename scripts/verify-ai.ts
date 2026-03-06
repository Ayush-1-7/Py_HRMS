/* ══════════════════════════════════════════════════════════
   AI Engine Verification Script (TS)
   ══════════════════════════════════════════════════════════ */

import { config } from "dotenv";
import path from "path";

// Load environment variables before any other imports
config({ path: path.resolve(process.cwd(), ".env.local") });

import mongoose from "mongoose";

async function runTests() {
    console.log("🚀 Starting AI Engine Verification...\n");

    // Dynamic imports to ensure environment is loaded
    const { connectDB } = await import("../config/mongodb");
    const { processMessage } = await import("../lib/ai/aiEngine");

    try {
        await connectDB();
        console.log("✅ Connected to MongoDB");
    } catch (e: any) {
        console.error("❌ Failed to connect to DB:", e.message);
        return;
    }

    const multiTurnTests = [
        "who is my last employee",
        "what is his department",
        "other details about him",
        "employee id 1",
        "show salary of that employee",
        "how many employees name is Ayush",
        "how many employees name is Ayush Sharma",
        "who is the employee id 1001",
        "who joining last",
        "any employee named Ayush",
        "who is the latest among them",
        "when was employee id 1 absent",
        "how many leaves has he taken",
        "who is the highest paid employee",
        "average salary by department",
        "department breakdown",
        "who is 10",
        "tell me about 10",
        "list employees called Ayush",
        "search for employees named Ayush Mehta",
        "who earns more than Ayush Sharma",
        "who has perfect attendance",
        "who took most leaves",
        "who is on leave today",
        "generate workforce report",
        "apply filters",
        "What if salary increases by 10%?",
        "Simulate hiring 5 new engineers in Engineering",
        "What if absenteeism increases by 5%?",
        "Predict payroll burn for next month",
        "Show department health index",
        "Attrition risk forecast",
        "hello"
    ];

    console.log("\n💬 Starting Multi-Turn Conversation Test...");
    let currentContext: any = { userRole: "Admin" };
    const history: any[] = [];

    for (const query of multiTurnTests) {
        console.log(`\n❓ User: "${query}"`);
        try {
            const response = await processMessage(query, currentContext, history);
            console.log("✅ AI:", response.message);

            // Update context and history for next turn
            if (response.contextUpdate) {
                currentContext = { ...currentContext, ...response.contextUpdate };
                console.log("   [Context Updated]", JSON.stringify(response.contextUpdate));
            }
            history.push({ role: "user", content: query, timestamp: Date.now() });
            history.push({ role: "assistant", content: response.message, timestamp: Date.now() });

        } catch (error: any) {
            console.error("❌ Error:", error.message);
        }
        console.log("-------------------------------------------");
    }

    await mongoose.disconnect();
    console.log("\n🏁 Verification Complete.");
}

runTests();
