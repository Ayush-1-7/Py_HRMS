export const DEPARTMENTS = [
  "Engineering",
  "Marketing",
  "Sales",
  "Human Resources",
  "Finance",
  "Operations",
  "Design",
  "Product",
  "Legal",
  "Customer Support",
] as const;

export type Department = (typeof DEPARTMENTS)[number];

export const DEPARTMENT_COLORS: Record<
  Department,
  { badge: string; dot: string }
> = {
  Engineering: {
    badge: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
    dot: "bg-indigo-500",
  },
  Marketing: {
    badge: "bg-pink-100 text-pink-700 dark:bg-pink-900/30 dark:text-pink-400",
    dot: "bg-pink-500",
  },
  Sales: {
    badge: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  "Human Resources": {
    badge: "bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400",
    dot: "bg-violet-500",
  },
  Finance: {
    badge: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  Operations: {
    badge: "bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400",
    dot: "bg-orange-500",
  },
  Design: {
    badge: "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-400",
    dot: "bg-cyan-500",
  },
  Product: {
    badge: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
    dot: "bg-sky-500",
  },
  Legal: {
    badge: "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-400",
    dot: "bg-rose-500",
  },
  "Customer Support": {
    badge: "bg-teal-100 text-teal-700 dark:bg-teal-900/30 dark:text-teal-400",
    dot: "bg-teal-500",
  },
};
