export const ROLES = [
    "Software Engineer",
    "Senior Software Engineer",
    "Lead Engineer",
    "Product Manager",
    "Product Designer",
    "UI/UX Designer",
    "HR Manager",
    "HR Specialist",
    "Sales Executive",
    "Account Manager",
    "Marketing Specialist",
    "Content Strategist",
    "Operations Manager",
    "QA Analyst",
    "DevOps Engineer",
    "Data Scientist",
] as const;

export type Role = (typeof ROLES)[number];
