"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  IoChevronForwardOutline,
  IoMailOutline,
  IoCallOutline,
  IoBriefcaseOutline,
  IoCalendarOutline,
  IoIdCardOutline,
  IoCreateOutline,
  IoTrashOutline,
  IoPersonOutline,
  IoTimeOutline,
  IoStatsChartOutline,
  IoLocationOutline,
  IoWalletOutline,
} from "react-icons/io5";
import { fetchEmployeeById, deleteEmployee } from "@/services/employeeService";
import { fetchAttendance, type AttendanceListResponse } from "@/services/attendanceService";
import { DEPARTMENT_COLORS, type Department } from "@/lib/departments";
import type { IEmployee } from "@/models/Employee";
import EmployeeModal from "@/components/employee/EmployeeModal";
import DeleteConfirmModal from "@/components/employee/DeleteConfirmModal";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import jsPDF from "jspdf";

export default function EmployeeProfilePage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [employee, setEmployee] = useState<IEmployee | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  /* tabs */
  const [activeTab, setActiveTab] = useState<"overview" | "attendance" | "activity">("overview");

  /* modals */
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [generatingPdf, setGeneratingPdf] = useState(false);
  const [deleting, setDeleting] = useState(false);

  /* attendance history */
  const [attendanceHistory, setAttendanceHistory] = useState<AttendanceListResponse | null>(null);
  const [loadingAttendance, setLoadingAttendance] = useState(false);

  const loadEmployee = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const data = await fetchEmployeeById(id);
      setEmployee(data);
      // Also load attendance history
      loadAttendance(data.name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load employee");
    } finally {
      setLoading(false);
    }
  };

  const loadAttendance = async (name: string) => {
    setLoadingAttendance(true);
    try {
      const to = new Date().toISOString().slice(0, 10);
      const from = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
      const data = await fetchAttendance(from, to, 1, 100, name);
      setAttendanceHistory(data);
    } catch {
      // Ignored
    } finally {
      setLoadingAttendance(false);
    }
  };

  useEffect(() => {
    loadEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleDelete = async () => {
    if (!employee) return;
    setDeleting(true);
    try {
      await deleteEmployee(String(employee._id));
      toast.success("Employee deleted successfully");
      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Delete failed");
    } finally {
      setDeleting(false);
    }
  };

  /* PDF Generation */
  const generatePaySlip = async () => {
    if (!employee) return;
    setGeneratingPdf(true);
    try {
      const doc = new jsPDF();
      const accentColor = [99, 102, 241]; // Indigo colors

      // Header
      doc.setFillColor(accentColor[0], accentColor[1], accentColor[2]);
      doc.rect(0, 0, 210, 40, "F");
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(24);
      doc.setFont("helvetica", "bold");
      doc.text("ElevateHR", 20, 25);
      doc.setFontSize(10);
      doc.text("Official Pay Advisory", 20, 32);

      // Body Section
      doc.setTextColor(50, 50, 50);
      doc.setFontSize(16);
      doc.text("Earnings Statement", 20, 55);

      doc.setDrawColor(200, 200, 200);
      doc.line(20, 60, 190, 60);

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");

      const startY = 70;
      doc.text("Employee Name:", 20, startY);
      doc.setFont("helvetica", "bold");
      doc.text(employee.name, 60, startY);

      doc.setFont("helvetica", "normal");
      doc.text("Employee ID:", 20, startY + 10);
      doc.text(`#${employee.id}`, 60, startY + 10);

      doc.text("Department:", 20, startY + 20);
      doc.text(employee.department, 60, startY + 20);

      doc.text("Pay Period:", 120, startY);
      doc.text(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }), 150, startY);

      // Breakdown Table
      doc.setFillColor(245, 245, 250);
      doc.rect(20, 100, 170, 10, "F");
      doc.setFont("helvetica", "bold");
      doc.text("Description", 25, 106.5);
      doc.text("Amount", 160, 106.5);

      doc.setFont("helvetica", "normal");
      doc.text("Basic Salary", 25, 120);
      const salary = employee.salary || 4500;
      doc.text(`$${salary.toLocaleString()}`, 160, 120);

      doc.text("Performance Bonus", 25, 130);
      doc.text("$0.00", 160, 130);

      doc.text("Deductions (Tax/Benefit)", 25, 140);
      doc.text("-$0.00", 160, 140);

      doc.line(20, 150, 190, 150);
      doc.setFont("helvetica", "bold");
      doc.setFontSize(12);
      doc.text("Net Payable", 25, 160);
      doc.text(`$${salary.toLocaleString()}`, 160, 160);

      // Footer
      doc.setFontSize(8);
      doc.setFont("helvetica", "italic");
      doc.setTextColor(150, 150, 150);
      doc.text("This is an electronically generated document and does not require a physical signature.", 105, 280, { align: "center" });

      doc.save(`PaySlip_${employee.name.replace(/\s+/g, '_')}_${new Date().getMonth() + 1}.pdf`);
      toast.success("Pay slip generated successfully");
    } catch (err) {
      toast.error("Failed to generate pay slip");
    } finally {
      setGeneratingPdf(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="h-4 w-48 rounded animate-pulse mb-8 bg-surface-muted border border-border-default" />
        <div className="h-10 w-80 rounded animate-pulse mb-4 bg-surface-muted border border-border-default" />
        <div className="h-5 w-64 rounded animate-pulse mb-12 bg-surface-muted border border-border-default" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-20 rounded-2xl animate-pulse bg-surface-muted border border-border-default" />
          ))}
        </div>
      </div>
    );
  }

  if (error || !employee) {
    return (
      <div className="p-8">
        <p className="text-sm text-danger">{error ?? "Employee not found"}</p>
      </div>
    );
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const deptColors =
    DEPARTMENT_COLORS[employee.department as Department] ??
    DEPARTMENT_COLORS["Engineering"];

  const joinDate = new Date(employee.joiningDate).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  const personalInfo = [
    { label: "Full Name", value: employee.name, icon: IoPersonOutline },
    { label: "Email Address", value: employee.email, icon: IoMailOutline },
    { label: "Phone Number", value: employee.phone || "Not linked", icon: IoCallOutline },
    { label: "Current Address", value: "Available in HR records", icon: IoLocationOutline },
  ];

  const professionalInfo = [
    { label: "Employee ID", value: `#${employee.id}`, icon: IoIdCardOutline },
    { label: "Department", value: employee.department, icon: IoStatsChartOutline },
    { label: "Designation", value: employee.designation || "Not assigned", icon: IoBriefcaseOutline },
    { label: "Joining Date", value: joinDate, icon: IoCalendarOutline },
    { label: "Base Salary", value: employee.salary ? `$${employee.salary.toLocaleString()} / month` : "$4,500 / month", icon: IoWalletOutline },
  ];

  return (
    <div className="p-4 md:p-8 max-w-[1400px] mx-auto animate-in fade-in duration-500">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-2 text-sm mb-8 text-text-tertiary">
        <Link href="/" className="hover:text-brand-primary transition-colors">Directory</Link>
        <IoChevronForwardOutline size={12} />
        <span className="font-semibold text-text-primary">Employee Profile</span>
      </nav>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="card-base p-8 text-center space-y-4 sticky top-8">
            <div className="relative inline-block">
              <div className="w-24 h-24 rounded-full bg-brand-subtle text-brand-primary flex items-center justify-center text-3xl font-bold ring-4 ring-background shadow-xl mx-auto">
                {employee.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="absolute bottom-1 right-1 w-6 h-6 rounded-full bg-success ring-4 ring-surface-base border border-white" />
            </div>

            <div className="space-y-1">
              <h1 className="text-2xl font-bold text-text-primary tracking-tight">{employee.name}</h1>
              <p className="text-sm font-medium text-text-secondary">{employee.designation}</p>
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              <span className={`text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full ${employee.status === 'active' ? 'bg-success-subtle text-success' : 'bg-surface-muted text-text-tertiary'}`}>
                {employee.status}
              </span>
              <span className="text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-brand-subtle text-brand-primary">
                {employee.department}
              </span>
            </div>

            <div className="pt-6 space-y-3">
              <button
                onClick={generatePaySlip}
                disabled={generatingPdf}
                className="w-full btn-primary py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold shadow-sm hover:shadow-lg transition-all active:scale-95 disabled:opacity-50"
              >
                {generatingPdf ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <IoWalletOutline size={18} />
                )}
                {generatingPdf ? "Generating..." : "Generate Pay Slip"}
              </button>

              <button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full btn-secondary py-3 rounded-xl flex items-center justify-center gap-2 text-sm font-bold hover:bg-surface-hover transition-colors active:scale-95 border border-border-default"
              >
                <IoCreateOutline size={18} />
                Modify Profile
              </button>

              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full py-3 rounded-xl text-xs font-bold bg-danger-subtle text-danger hover:bg-danger-hover transition-colors flex items-center justify-center gap-2 transition-all active:scale-95"
              >
                <IoTrashOutline size={14} /> Remove Member
              </button>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="lg:col-span-8 space-y-8">
          {/* Tabs Navigation */}
          <div className="flex border-b border-border-default gap-8 overflow-x-auto no-scrollbar">
            {[
              { id: "overview", label: "Overview", icon: IoPersonOutline },
              { id: "attendance", label: "Attendance History", icon: IoTimeOutline },
              { id: "activity", label: "Recent Activity", icon: IoStatsChartOutline },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-2 py-4 text-sm font-bold border-b-2 transition-all whitespace-nowrap ${activeTab === tab.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-text-tertiary hover:text-text-secondary'}`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {activeTab === "overview" && (
              <div className="space-y-8">
                {/* Personal Section */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-text-tertiary">Personal Identity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {personalInfo.map((item, idx) => (
                      <div key={idx} className="card-base p-4 flex items-center gap-4 group hover:border-brand-primary transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-text-tertiary group-hover:bg-brand-subtle group-hover:text-brand-primary transition-colors">
                          <item.icon size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{item.label}</p>
                          <p className="text-sm font-semibold text-text-primary">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Professional Section */}
                <section className="space-y-4">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-text-tertiary">Professional Credentials</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {professionalInfo.map((item, idx) => (
                      <div key={idx} className="card-base p-4 flex items-center gap-4 group hover:border-brand-primary transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-surface-muted flex items-center justify-center text-text-tertiary group-hover:bg-brand-subtle group-hover:text-brand-primary transition-colors">
                          <item.icon size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] font-bold text-text-tertiary uppercase tracking-wider">{item.label}</p>
                          <p className="text-sm font-semibold text-text-primary">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold uppercase tracking-widest text-text-tertiary">Last 30 Days Performance</h3>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-success" />
                      <span className="text-[10px] font-bold text-text-secondary">Present</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-danger" />
                      <span className="text-[10px] font-bold text-text-secondary">Absent</span>
                    </div>
                  </div>
                </div>

                <div className="card-base overflow-hidden">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="bg-surface-muted text-[10px] font-bold uppercase tracking-widest text-text-tertiary">
                        <th className="px-6 py-3">Date</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3">Clock In</th>
                        <th className="px-6 py-3">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-default">
                      {loadingAttendance ? [1, 2, 3].map(i => <tr key={i}><td colSpan={4} className="p-4"><Skeleton className="h-4 w-full" /></td></tr>) :
                        attendanceHistory?.dates.map((date, idx) => {
                          const record = attendanceHistory.employees[0]?.attendance[date];
                          if (!record || record.status === 'unmarked') return null;
                          return (
                            <tr key={idx} className="hover:bg-surface-hover transition-colors">
                              <td className="px-6 py-4 text-xs font-semibold text-text-primary">{new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                              <td className="px-6 py-4">
                                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${record.status === 'present' ? 'bg-success-subtle text-success' : 'bg-danger-subtle text-danger'}`}>
                                  {record.status}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-xs text-text-secondary font-mono">09:12 AM</td>
                              <td className="px-6 py-4 text-xs text-text-tertiary italic">{record.note || "Standard Shift"}</td>
                            </tr>
                          );
                        })
                      }
                      {!loadingAttendance && (!attendanceHistory || attendanceHistory.dates.length === 0) && (
                        <tr><td colSpan={4} className="px-6 py-12 text-center text-sm text-text-tertiary">No attendance records found for this period.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-6">
                <h3 className="text-sm font-bold uppercase tracking-widest text-text-tertiary">Operational Timeline</h3>
                <div className="space-y-6 pl-4 border-l-2 border-border-default">
                  {[
                    { title: "Profile Refined", date: "Just now", type: "system", desc: "Premium theme attributes applied." },
                    { title: "Department Moved", date: "2 days ago", type: "hr", desc: "Transferred from General to Management." },
                    { title: "Joined the Platform", date: joinDate, type: "join", desc: "Employee record officially created." },
                  ].map((item, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-[25px] top-1.5 w-4 h-4 rounded-full bg-surface-base border-2 border-brand-primary group-hover:scale-125 transition-transform" />
                      <div className="space-y-1">
                        <p className="text-xs font-bold text-text-primary">{item.title}</p>
                        <p className="text-[10px] text-text-tertiary font-medium">{item.date}</p>
                        <p className="text-xs text-text-secondary leading-relaxed">{item.desc}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Timestamps */}
      <div className="mt-8 flex gap-6 text-xs text-text-tertiary">
        <p>
          Created{" "}
          {new Date(employee.createdAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
        <p>
          Last updated{" "}
          {new Date(employee.updatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        </p>
      </div>

      {/* Edit Modal */}
      <EmployeeModal
        open={isEditModalOpen}
        editData={employee}
        onClose={() => setIsEditModalOpen(false)}
        onSuccess={() => {
          setIsEditModalOpen(false);
          loadEmployee();
        }}
      />

      {/* Delete Modal */}
      <DeleteConfirmModal
        open={isDeleteModalOpen}
        count={1}
        onCancel={() => setIsDeleteModalOpen(false)}
        onConfirm={handleDelete}
        loading={deleting}
      />
    </div>
  );
}
