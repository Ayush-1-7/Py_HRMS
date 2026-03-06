/* ══════════════════════════════════════════════════════════
   AI Layer — Shared Types
   ══════════════════════════════════════════════════════════ */

/** Chat message in the conversation */
export interface AIMessage {
    role: "user" | "assistant";
    content: string;
    timestamp: number;
    actions?: AIAction[];
    reasoningTrace?: ReasoningStep[];
    explanation?: string;
    suggestions?: {
        insights: string[];
        actions: string[];
        questions: string[];
    };
}

/** Classified intent from user message */
export type AIIntentType =
    | "COUNT"        // "How many employees…"
    | "LIST"         // "Who was absent…", "Show employees…"
    | "SUMMARY"      // "Show payroll summary…", "Attendance summary…"
    | "INSIGHT"      // "Which department has highest…", "Top 5…"
    | "ACTION"       // "Generate report…", "Draft email…"
    | "FILTER"       // "Show only Finance…", "Filter by…"
    | "GREETING"     // "Hi", "Hello"
    | "HELP"         // "What can you do?"
    | "SIMULATION"   // "What if absenteeism increases by 10%?"
    | "COMPARISON"   // "Compare Engineering vs Marketing"
    | "PREDICTIVE"   // "Predict payroll cost next year"
    | "SCHEMA"       // "What fields are in employee?"
    | "DATA_QUERY"   // Specific record queries (ID 1, John's salary)
    | "LEAVE"        // "How many leaves has ID 1 taken?"
    | "ANALYTICS"    // "Department breakdown", "Salary distribution"
    | "UNKNOWN";     // Unrecognized

export interface AIIntent {
    type: AIIntentType;
    entity: "employee" | "attendance" | "payroll" | "department" | "general";
    filters: Record<string, unknown>;
    rawQuery: string;
    dateRange?: { from: string; to: string };
    department?: string;
    status?: string;
    limit?: number;
    actionType?: string;
}

/** Action that AI can propose / execute */
export interface AIAction {
    id: string;
    type: "generate_report" | "apply_filter" | "draft_email" | "export_data" | "simulate_scenario" | "salary_adjustment";
    label: string;
    description: string;
    params: Record<string, unknown>;
    requiresConfirmation: boolean;
    status: "pending" | "confirmed" | "executed" | "cancelled";
}

/** Step inside a multi-step reasoning trace */
export interface ReasoningStep {
    step: string;
    action: string;
    result: string;
}

/** Chat context from the client */
export interface AIContext {
    page?: string;
    dateRange?: { from: string; to: string };
    employeeId?: string;
    department?: string;
    userRole?: string;
    lastEmployeeMentioned?: {
        id: number;
        name: string;
        employeeId?: string;
    };
    lastQueryType?: string;
    lastResultSetIds?: number[]; // IDs of employees from the last search for "among them" reasoning
}

/** Response from the AI engine */
export interface AIResponse {
    message: string;
    explanation?: string;       // Natural language explanation of how data was derived
    reasoningTrace?: ReasoningStep[]; // Steps taken to answer
    actions?: AIAction[];
    filters?: Record<string, unknown>;
    data?: unknown;
    type: "text" | "table" | "chart" | "action_prompt" | "simulation" | "detailed";
    source?: string;           // E.g., "Employees table (status field)"
    details?: Record<string, string | number | boolean>; // Supporting data for "detailed" type
    suggestions?: {
        insights: string[];
        actions: string[];
        questions: string[];
    };
    contextUpdate?: Partial<AIContext>; // Optional update to push back to client
}

/** Dashboard insight card */
export interface InsightCard {
    id: string;
    title: string;
    value: string;
    description: string;
    trend: "up" | "down" | "stable";
    trendValue: string;
    confidence: number;       // 0–100
    category: "attendance" | "workforce" | "performance" | "risk";
    icon: string;
    explanation: string;
}

/** Per-employee AI analysis */
export interface EmployeeAnalysisResult {
    employeeId: string;
    employeeName: string;
    attendanceConsistency: {
        score: number;          // 0–100
        label: string;
        totalDays: number;
        presentDays: number;
        absentDays: number;
    };
    absenteeismRisk: {
        level: "low" | "medium" | "high";
        score: number;          // 0–100
        factors: string[];
    };
    salaryPosition: {
        percentile: number;
        departmentAvg: number;
        employeeSalary: number;
        comparison: "above" | "below" | "at_average";
    };
    promotionReadiness: {
        score: number;          // 0–100
        label: string;
        factors: { name: string; score: number; weight: number }[];
    };
}

/** NL search result */
export interface NLSearchResult {
    filters: Record<string, unknown>;
    filterDescription: string;
    appliedFilters: { label: string; value: string }[];
}

/** Result of a what-if scenario simulation */
export interface SimulationResult {
    scenario: string;
    parameters: Record<string, number>;
    currentMetrics: Record<string, number | string>;
    projectedMetrics: Record<string, number | string>;
    impactSummary: string;
}

/** AI calculated predictive metrics for the dashboard */
export interface PredictiveMetrics {
    attendanceTrendSlope: number; // positive = improving
    payrollBurnRateNextMonth: number;
    departmentHealthIndex: Record<string, number>; // 0-100
    projectedAttritionCount: number;
}
