"use client";

import Link from "next/link";
import { IoBriefcaseOutline, IoEllipsisHorizontal, IoCreateOutline, IoTrashOutline, IoPersonOutline } from "react-icons/io5";
import { DEPARTMENT_COLORS, type Department } from "@/lib/departments";
import type { IEmployee } from "@/models/Employee";
import { useState, useRef, useEffect } from "react";
import Dropdown from "@/components/ui/Dropdown";

interface EmployeeListItemProps {
  employee: IEmployee;
  checked: boolean;
  density?: "comfortable" | "compact";
  visibleColumns?: Set<string>;
  onCheck: (id: string) => void;
  onEdit: (employee: IEmployee) => void;
  onDelete: (employee: IEmployee) => void;
  index?: number;
}

export default function EmployeeListItem({
  employee,
  checked,
  density = "comfortable",
  visibleColumns = new Set(["empId", "name", "dept", "designation", "status", "actions"]),
  onCheck,
  onEdit,
  onDelete,
  index = 0,
}: EmployeeListItemProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const mongoId = String(employee._id);

  const deptColors =
    DEPARTMENT_COLORS[employee.department as Department] ??
    DEPARTMENT_COLORS["Engineering"];

  const initials = employee.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <>
      <tr
        onClick={() => setIsExpanded(!isExpanded)}
        className={`transition-all cursor-pointer hover:bg-surface-hover group border-b border-border-default animate-fade-in-up ${isExpanded ? 'bg-surface-muted/50' : ''}`}
        style={{
          background: checked ? "var(--brand-subtle)" : undefined,
          animationDelay: `${index * 50}ms`,
          animationFillMode: 'both'
        }}
      >
        {/* Checkbox */}
        <td
          className={`pl-6 pr-2 ${density === 'compact' ? 'py-2' : 'py-4'} w-12 border-b border-border-default`}
          onClick={(e) => e.stopPropagation()}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={() => onCheck(mongoId)}
            className="w-4 h-4 rounded border-border-default text-brand-primary focus:ring-brand-subtle cursor-pointer"
          />
        </td>

        {/* Employee ID */}
        <td className={`px-4 ${density === 'compact' ? 'py-1' : 'py-4'} text-[13px] font-mono tracking-wider font-bold text-text-tertiary border-b border-border-default`}>
          {employee.employeeId || `#${employee.id}`}
        </td>

        {/* Employee name + email */}
        <td className={`px-4 ${density === 'compact' ? 'py-1' : 'py-4'} border-b border-border-default`}>
          <div className="flex items-center gap-3">
            <div
              className={`${density === 'compact' ? 'w-8 h-8 text-[10px]' : 'w-10 h-10 text-xs'} rounded-full flex items-center justify-center font-bold shrink-0 bg-brand-subtle text-brand-primary ring-1 ring-brand-muted transition-transform group-hover:scale-110`}
            >
              {initials}
            </div>
            <div className="min-w-0">
              <span
                className={`${density === 'compact' ? 'text-xs' : 'text-sm'} font-semibold leading-tight hover:text-brand-primary transition-colors text-text-primary block truncate max-w-[200px]`}
                style={{ viewTransitionName: `employee-name-${mongoId}` }}
              >
                {employee.name}
              </span>
              <p className={`${density === 'compact' ? 'text-[11px]' : 'text-[13px]'} mt-0.5 leading-tight text-text-secondary truncate max-w-[200px]`}>
                {employee.email}
              </p>
            </div>
          </div>
        </td>

        {/* Department */}
        {visibleColumns.has("dept") && (
          <td className={`px-4 ${density === 'compact' ? 'py-1' : 'py-4'} whitespace-nowrap border-b border-border-default text-center`}>
            <span
              className={`inline-flex items-center gap-1.5 ${density === 'compact' ? 'text-[10px] px-2 py-0.5' : 'text-xs px-2.5 py-1'} font-semibold rounded-full border shadow-sm transition-all group-hover:border-brand-muted ${deptColors.badge}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${deptColors.dot}`} />
              {employee.department}
            </span>
          </td>
        )}

        {/* Designation */}
        {visibleColumns.has("designation") && (
          <td className={`px-4 ${density === 'compact' ? 'py-1' : 'py-4'} border-b border-border-default`}>
            <div className={`flex items-center gap-2 ${density === 'compact' ? 'text-[11px]' : 'text-[13px]'} font-medium text-text-tertiary`}>
              <IoBriefcaseOutline size={density === 'compact' ? 13 : 15} className="shrink-0 text-text-tertiary group-hover:text-brand-primary transition-colors" />
              <span className="truncate max-w-40 text-text-secondary">
                {employee.designation || "—"}
              </span>
            </div>
          </td>
        )}

        {/* Status */}
        <td className={`px-4 ${density === 'compact' ? 'py-1' : 'py-4'} whitespace-nowrap border-b border-border-default text-center`}>
          <span
            className={`inline-flex items-center gap-1.5 ${density === 'compact' ? 'text-[11px] px-2 py-0.5' : 'text-[12px] px-2.5 py-1'} font-bold uppercase tracking-widest rounded-full transition-all group-hover:ring-brand-primary ${employee.status === "active"
              ? "bg-success-subtle text-success ring-1 ring-success shadow-sm"
              : employee.status === "on leave"
                ? "bg-amber-subtle text-amber ring-1 ring-amber shadow-sm"
                : employee.status === "probation"
                  ? "bg-indigo-subtle text-indigo ring-1 ring-indigo shadow-sm"
                  : "bg-surface-muted text-text-secondary ring-1 ring-border-default shadow-sm"
              }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${employee.status === "active" ? "bg-success" :
                employee.status === "on leave" ? "bg-amber" :
                  employee.status === "probation" ? "bg-indigo" :
                    "bg-text-tertiary"
                }`}
            />
            {employee.status}
          </span>
        </td>

        {/* Action menu */}
        <td
          className={`px-4 ${density === 'compact' ? 'py-1' : 'py-4'} w-12 text-right border-b border-border-default`}
          onClick={(e) => e.stopPropagation()}
        >
          <Dropdown
            options={[
              { value: "edit", label: "Edit Profile", icon: <IoCreateOutline size={16} className="text-brand-primary" /> },
              { value: "delete", label: "Remove", icon: <IoTrashOutline size={16} className="text-danger" /> }
            ]}
            value=""
            onChange={(val) => {
              if (val === "edit") onEdit(employee);
              if (val === "delete") onDelete(employee);
            }}
            trigger={
              <div className="p-1.5 rounded-full transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 hover:bg-surface-hover text-text-primary">
                <IoEllipsisHorizontal size={18} />
              </div>
            }
          />
        </td>
      </tr>

      {/* Expanded Details Row */}
      {isExpanded && (
        <tr className="bg-surface-muted/30 border-b border-border-default animate-in fade-in slide-in-from-top-1 duration-300">
          <td colSpan={7} className="px-10 py-6">
            <div className="flex flex-wrap gap-12 items-start stagger-1">
              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">Direct Contact</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    <span className="w-8 h-8 rounded-lg bg-surface-base flex items-center justify-center text-text-tertiary">@</span>
                    {employee.email}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    <span className="w-8 h-8 rounded-lg bg-surface-base flex items-center justify-center text-text-tertiary">#</span>
                    {employee.phone || "No phone listed"}
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-text-tertiary">Employment Detail</p>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    <span className="w-8 h-8 rounded-lg bg-surface-base flex items-center justify-center text-text-tertiary">
                      <IoBriefcaseOutline size={16} />
                    </span>
                    Joined {new Date(employee.joiningDate).toLocaleDateString(undefined, { dateStyle: 'long' })}
                  </div>
                  <div className="flex items-center gap-2 text-sm font-medium text-text-primary">
                    <span className="w-8 h-8 rounded-lg bg-surface-base flex items-center justify-center text-text-tertiary">
                      <IoPersonOutline size={14} />
                    </span>
                    Status: <span className="capitalize">{employee.status}</span>
                  </div>
                </div>
              </div>

              <div className="ml-auto flex items-end gap-3 self-center">
                <Link
                  href={`/employee/${mongoId}`}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-brand-primary text-white shadow-lg shadow-brand-primary/20 hover:scale-[1.03] transition-all"
                >
                  View Full Profile
                </Link>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEdit(employee);
                  }}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold border border-border-default bg-surface-base text-text-primary hover:bg-surface-hover transition-all"
                >
                  Quick Edit
                </button>
              </div>
            </div>
          </td>
        </tr>
      )}
    </>
  );
}
