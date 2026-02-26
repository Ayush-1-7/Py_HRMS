"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { toast } from "sonner";
import { useHotkeys } from "react-hotkeys-hook";
import {
    IoCheckmarkCircle,
    IoAlertCircle,
    IoPersonOutline,
    IoBriefcaseOutline,
    IoSettingsOutline,
    IoCloseOutline,
    IoMailOutline,
    IoCalendarOutline,
    IoCallOutline
} from "react-icons/io5";
import { DEPARTMENTS } from "@/lib/departments";
import { ROLES } from "@/lib/roles";
import { createEmployee, updateEmployee, checkEmployeeIdExists, type EmployeePayload } from "@/services/employeeService";
import Dropdown from "@/components/ui/Dropdown";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface AddEmployeeFormProps {
    onSuccess: () => void;
    onCancel: () => void;
    editData?: any | null;
}

type FormState = {
    id: string;
    employeeId: string;
    name: string;
    email: string;
    department: string;
    designation: string;
    phone: string;
    salary: string;
    joiningDate: string;
    status: "active" | "inactive" | "probation" | "on leave";
};

type Errors = Partial<Record<keyof FormState, string>>;

const INITIAL_STATE: FormState = {
    id: "",
    employeeId: "",
    name: "",
    email: "",
    department: "",
    designation: "",
    phone: "",
    salary: "4500",
    joiningDate: new Date().toISOString().split("T")[0],
    status: "active",
};

function toDateInput(d: Date | string | undefined) {
    if (!d) return new Date().toISOString().split("T")[0];
    return new Date(d).toISOString().split("T")[0];
}

export default function AddEmployeeForm({ onSuccess, onCancel, editData }: AddEmployeeFormProps) {
    const isEdit = !!editData;
    const [form, setForm] = useState<FormState>(INITIAL_STATE);
    const [errors, setErrors] = useState<Errors>({});
    const [idStatus, setIdStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
    const [empIdStatus, setEmpIdStatus] = useState<"idle" | "checking" | "ok" | "taken">("idle");
    const [submitting, setSubmitting] = useState(false);
    const [isDesignationFocused, setIsDesignationFocused] = useState(false);
    const [designationQuery, setDesignationQuery] = useState("");
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    /* Populate on Edit */
    useEffect(() => {
        if (editData) {
            setForm({
                id: String(editData.id),
                employeeId: editData.employeeId ?? "",
                name: editData.name,
                email: editData.email,
                department: editData.department,
                designation: editData.designation ?? "",
                phone: editData.phone ?? "",
                salary: String(editData.salary ?? 4500),
                joiningDate: toDateInput(editData.joiningDate),
                status: editData.status ?? "active",
            });
            setIdStatus("ok");
            setEmpIdStatus("ok");
        } else {
            setForm(INITIAL_STATE);
            setIdStatus("idle");
            setEmpIdStatus("idle");
        }
    }, [editData]);

    /* Shortcuts */
    useHotkeys("ctrl+enter", () => {
        if (isValid) handleSubmit();
    }, { enableOnFormTags: true });

    /* Capitalization Enforcement */
    const handleNameChange = (val: string) => {
        const capitalized = val.split(" ").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
        setForm(f => ({ ...f, name: capitalized }));
        validateField("name", capitalized);
    };

    /* Validation Logic */
    const validateField = (key: keyof FormState, value: string) => {
        let error = "";
        if (key === "name" && !value.trim()) error = "Full name is required";
        if (key === "email") {
            if (!value.trim()) error = "Email is required";
            else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) error = "Invalid email format";
        }
        if (key === "department" && !value) error = "Department is required";
        if (key === "id" && !value) error = "Employee ID is required";
        if (key === "designation" && !value.trim()) error = "Role / Designation is required";
        if (key === "phone" && value.trim() && !/^\+?[\d\s-]{8,15}$/.test(value)) error = "Invalid phone format (e.g. +1 555-0123)";

        setErrors(prev => ({ ...prev, [key]: error }));
    };

    const checkId = useCallback((val: string) => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        if (!val || isNaN(Number(val))) {
            setIdStatus("idle");
            return;
        }

        setIdStatus("checking");
        debounceRef.current = setTimeout(async () => {
            try {
                const { exists } = await checkEmployeeIdExists(Number(val));
                setIdStatus(exists ? "taken" : "ok");
                if (exists) setErrors(prev => ({ ...prev, id: "This ID is already assigned" }));
                else setErrors(prev => ({ ...prev, id: "" }));
            } catch {
                setIdStatus("idle");
            }
        }, 500);
    }, []);

    const handleEmployeeIdChange = (val: string) => {
        setForm(f => ({ ...f, employeeId: val.toUpperCase() }));
        setEmpIdStatus("ok");
    };

    const handleIdChange = (val: string) => {
        if (val === "" || /^\d+$/.test(val)) {
            setForm(f => ({ ...f, id: val }));
            checkId(val);
        }
    };

    const filteredRoles = ROLES.filter(role =>
        role.toLowerCase().includes(designationQuery.toLowerCase())
    );

    const handleSubmit = async (e?: React.FormEvent) => {
        e?.preventDefault();
        if (!isValid) return;

        setSubmitting(true);
        try {
            const payload: EmployeePayload = {
                ...form,
                id: Number(form.id),
                salary: Number(form.salary),
            };
            if (isEdit && editData) {
                await updateEmployee(String(editData._id), payload);
                toast.success("Employee profile updated");
            } else {
                await createEmployee(payload);
                toast.success("Employee added successfully");
            }
            onSuccess();
        } catch (err) {
            toast.error(isEdit ? "Update failed" : "Onboarding failed", {
                description: err instanceof Error ? err.message : "Internal server error",
                action: {
                    label: "Retry",
                    onClick: () => handleSubmit(),
                },
            });
        } finally {
            setSubmitting(false);
        }
    };

    const isValid =
        form.id &&
        idStatus === "ok" &&
        form.employeeId &&
        form.name &&
        form.email &&
        form.department &&
        form.designation?.trim() &&
        Object.values(errors).every(e => !e);

    const inputClass = "w-full rounded-xl border border-slate-200 dark:border-slate-800 pl-11 pr-4 py-3 text-[15px] outline-none transition-all bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 focus:ring-4 focus:ring-brand-subtle focus:border-brand-primary text-slate-900 dark:text-slate-100 placeholder:text-slate-400 shadow-sm";
    const labelClass = "block text-[11px] font-bold uppercase tracking-wider mb-2.5 ml-1 text-slate-600 dark:text-slate-400 flex items-center gap-2";
    const sectionHeaderClass = "flex items-center gap-3 mb-8 text-[12px] font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800 pb-4";
    const iconWrapperClass = "absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-brand-primary transition-colors";

    return (
        <div className="flex flex-col h-full pt-10">
            <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto thin-scrollbar px-2 pb-10">
                {/* Section: Identity */}
                <div className="mb-10 animate-fade-in-up stagger-1">
                    <div className={sectionHeaderClass}>
                        <div className="w-8 h-8 rounded-lg bg-brand-subtle text-brand-primary flex items-center justify-center">
                            <IoPersonOutline size={18} />
                        </div>
                        Identity & Contact
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-1">
                            <label htmlFor="id" className={labelClass}>
                                System Numeric ID <span className="text-danger">*</span>
                            </label>
                            <div className="relative group">
                                <IoBriefcaseOutline className={iconWrapperClass} size={18} />
                                <input
                                    id="id"
                                    type="text"
                                    inputMode="numeric"
                                    placeholder="e.g. 1001"
                                    value={form.id}
                                    onChange={(e) => handleIdChange(e.target.value)}
                                    disabled={isEdit}
                                    className={`${inputClass} ${errors.id ? 'border-rose-500 focus:ring-rose-500/10 focus:border-rose-500' : idStatus === 'ok' ? 'border-emerald-500' : ''} ${isEdit ? 'opacity-60 cursor-not-allowed bg-slate-50 dark:bg-slate-900/50' : ''}`}
                                    autoFocus={!isEdit}
                                />
                                <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center gap-2">
                                    {!isEdit && idStatus === "checking" && <div className="w-4 h-4 rounded-full border-2 border-brand-primary/30 border-t-brand-primary animate-spin" />}
                                    {!isEdit && idStatus === "ok" && <IoCheckmarkCircle className="text-success" size={20} />}
                                    {!isEdit && idStatus === "taken" && <IoAlertCircle className="text-danger" size={20} />}
                                </div>
                            </div>
                            {errors.id && <p className="text-[10px] text-danger mt-2 ml-1 font-bold">{errors.id}</p>}
                        </div>

                        <div className="md:col-span-1">
                            <label htmlFor="employeeId" className={labelClass}>
                                Employee ID <span className="text-danger">*</span>
                            </label>
                            <div className="relative group">
                                <IoBriefcaseOutline className={iconWrapperClass} size={18} />
                                <input
                                    id="employeeId"
                                    type="text"
                                    placeholder="e.g. EMP-001"
                                    value={form.employeeId}
                                    onChange={(e) => handleEmployeeIdChange(e.target.value)}
                                    className={`${inputClass} ${empIdStatus === 'ok' ? 'border-emerald-500' : ''}`}
                                />
                            </div>
                        </div>

                        <div className="md:col-span-1">
                            <label htmlFor="name" className={labelClass}>
                                Full Name <span className="text-danger">*</span>
                            </label>
                            <div className="relative group">
                                <IoPersonOutline className={iconWrapperClass} size={18} />
                                <input
                                    id="name"
                                    type="text"
                                    placeholder="e.g. Ayush Sharma"
                                    value={form.name}
                                    onChange={(e) => handleNameChange(e.target.value)}
                                    className={`${inputClass} ${errors.name ? 'border-danger' : ''}`}
                                />
                            </div>
                            {errors.name && <p className="text-[10px] text-danger mt-2 ml-1 font-bold">{errors.name}</p>}
                        </div>

                        <div className="md:col-span-1">
                            <label htmlFor="email" className={labelClass}>
                                Email Address <span className="text-danger">*</span>
                            </label>
                            <div className="relative group">
                                <IoMailOutline className={iconWrapperClass} size={18} />
                                <input
                                    id="email"
                                    type="email"
                                    placeholder="ayush@company.com"
                                    value={form.email}
                                    onChange={(e) => {
                                        setForm(f => ({ ...f, email: e.target.value }));
                                        validateField("email", e.target.value);
                                    }}
                                    className={`${inputClass} ${errors.email ? 'border-danger' : ''}`}
                                />
                            </div>
                            {errors.email && <p className="text-[10px] text-danger mt-2 ml-1 font-bold">{errors.email}</p>}
                        </div>
                    </div>
                </div>

                {/* Section: Role */}
                <div className="mb-10 animate-fade-in-up stagger-2">
                    <div className={sectionHeaderClass}>
                        <div className="w-8 h-8 rounded-lg bg-accent-subtle text-accent-primary flex items-center justify-center">
                            <IoBriefcaseOutline size={18} />
                        </div>
                        Professional Role
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="department" className={labelClass}>
                                Department <span className="text-danger">*</span>
                            </label>
                            <Dropdown
                                options={DEPARTMENTS.map(d => ({ value: d, label: d }))}
                                value={form.department}
                                onChange={(val) => {
                                    setForm(f => ({ ...f, department: val }));
                                    validateField("department", val);
                                }}
                                placeholder="Select Department"
                                className="w-full h-11"
                            />
                            {errors.department && <p className="text-[10px] text-danger mt-2 ml-1 font-bold">{errors.department}</p>}
                        </div>

                        <div className="relative group">
                            <label htmlFor="designation" className={labelClass}>
                                Designation <span className="text-danger">*</span>
                            </label>
                            <div className="relative">
                                <IoBriefcaseOutline className={iconWrapperClass} size={18} />
                                <input
                                    id="designation"
                                    type="text"
                                    placeholder="e.g. Senior Manager"
                                    value={form.designation}
                                    onChange={(e) => {
                                        setForm(f => ({ ...f, designation: e.target.value }));
                                        setDesignationQuery(e.target.value);
                                        validateField("designation", e.target.value);
                                    }}
                                    onFocus={() => setIsDesignationFocused(true)}
                                    onBlur={() => setTimeout(() => setIsDesignationFocused(false), 200)}
                                    className={`${inputClass} ${errors.designation ? 'border-danger' : ''}`}
                                />
                            </div>
                            {errors.designation && <p className="text-[10px] text-danger mt-2 ml-1 font-bold">{errors.designation}</p>}
                            {isDesignationFocused && filteredRoles.length > 0 && (
                                <div className="absolute top-full left-0 w-full mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-20 overflow-hidden animate-fade-in-up">
                                    {filteredRoles.map(role => (
                                        <button
                                            key={role}
                                            type="button"
                                            onClick={() => {
                                                setForm(f => ({ ...f, designation: role }));
                                                setIsDesignationFocused(false);
                                                setErrors(prev => ({ ...prev, designation: "" }));
                                            }}
                                            className="w-full text-left px-5 py-4 text-[13px] font-black italic uppercase tracking-tight hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-900 dark:text-slate-100 transition-all border-b border-slate-100 dark:border-slate-800 last:border-0 flex items-center gap-3"
                                        >
                                            <div className="w-1.5 h-1.5 rounded-full bg-brand-primary" />
                                            {role}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>

                        <div>
                            <label htmlFor="salary" className={labelClass}>
                                Annual Salary ($)
                            </label>
                            <div className="relative group">
                                <IoBriefcaseOutline className={iconWrapperClass} size={18} />
                                <input
                                    id="salary"
                                    type="number"
                                    placeholder="e.g. 75000"
                                    value={form.salary}
                                    onChange={(e) => setForm(f => ({ ...f, salary: e.target.value }))}
                                    className={inputClass}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* Section: Lifecycle */}
                <div className="mb-10 animate-fade-in-up stagger-3">
                    <div className={sectionHeaderClass}>
                        <div className="w-8 h-8 rounded-lg bg-surface-muted text-text-tertiary flex items-center justify-center">
                            <IoSettingsOutline size={18} />
                        </div>
                        Lifecycle & Contact
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label htmlFor="joiningDate" className={labelClass}>
                                Joining Date
                            </label>
                            <div className="relative group">
                                <IoCalendarOutline className={iconWrapperClass} size={18} />
                                <input
                                    id="joiningDate"
                                    type="date"
                                    value={form.joiningDate}
                                    onChange={(e) => setForm(f => ({ ...f, joiningDate: e.target.value }))}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="phone" className={labelClass}>
                                Phone Number
                            </label>
                            <div className="relative group">
                                <IoCallOutline className={iconWrapperClass} size={18} />
                                <input
                                    id="phone"
                                    type="tel"
                                    placeholder="+1 (555) 000-0000"
                                    value={form.phone}
                                    onChange={(e) => setForm(f => ({ ...f, phone: e.target.value }))}
                                    className={inputClass}
                                />
                            </div>
                        </div>

                        <div>
                            <label htmlFor="status" className={labelClass}>
                                Current Status
                            </label>
                            <Dropdown
                                options={[
                                    { value: "active", label: "Active" },
                                    { value: "on leave", label: "On Leave" },
                                    { value: "probation", label: "Probation" },
                                    { value: "inactive", label: "Inactive" }
                                ]}
                                value={form.status}
                                onChange={(val) => setForm(f => ({ ...f, status: val as any }))}
                                className="w-full h-11"
                            />
                        </div>
                    </div>
                </div>
            </form>

            {/* Action Bar */}
            <div className="mt-auto py-8 border-t border-border-default flex flex-col-reverse md:flex-row items-center justify-end gap-4">
                <button
                    type="button"
                    onClick={onCancel}
                    className="w-full md:w-auto px-8 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all border border-transparent hover:border-slate-200 dark:hover:border-slate-700 flex items-center justify-center gap-3 group"
                >
                    <IoCloseOutline size={20} className="group-hover:rotate-90 transition-transform" />
                    Abort Process
                </button>
                <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={!isValid || submitting}
                    className="btn-primary w-full md:w-auto px-12 py-3.5 rounded-xl text-sm font-bold shadow-lg shadow-brand-primary/20 disabled:opacity-50 disabled:grayscale transition-all active:scale-[0.98]"
                >
                    {submitting ? (
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            {isEdit ? "Updating Credentials…" : "Expanding Workforce…"}
                        </div>
                    ) : (
                        isEdit ? "Save Profile Changes" : "Complete Onboarding"
                    )}
                </button>
            </div>
        </div>
    );
}
