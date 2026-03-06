/* ══════════════════════════════════════════════════════════
   AI Engine Verification Script
   ══════════════════════════════════════════════════════════ */

const dotenv = require("dotenv");
dotenv.config({ path: ".env.local" });

const mongoose = require("mongoose");
const { processMessage } = require("./lib/ai/aiEngine");

async function runTests() {
    console.log("🚀 Starting AI Engine Verification...\n");

    const testQueries = [
        "Who is employee with ID 1?",
        "What is the status of employee named Ayush?",
        "What is Ayush's blood group?",
        "Show employees in Engineering earning above department average",
        "How many employees are inactive?",
        "List all employees in Finance with Active status",
        "What fields are in employee?",
    ];

    const context = { userRole: "Admin" };

    for (const query of testQueries) {
        console.log(`\n❓ Query: "${query}"`);
        try {
            const response = await processMessage(query, context);
            console.log("✅ Response:");
            console.log("Answer:", response.message);
            if (response.source) console.log("Source:", response.source);
            if (response.details) console.log("Details:", JSON.stringify(response.details, null, 2));
            if (response.suggestions) {
                console.log("Suggestions:");
                console.log(" - Insights:", response.suggestions.insights.join(", "));
                console.log(" - Actions:", response.suggestions.actions.join(", "));
                console.log(" - Questions:", response.suggestions.questions.join(", "));
            }
        } catch (error) {
            console.error("❌ Error:", error.message);
        }
        console.log("-------------------------------------------");
    }

    mongoose.disconnect();
    console.log("\n🏁 Verification Complete.");
}

runTests();
