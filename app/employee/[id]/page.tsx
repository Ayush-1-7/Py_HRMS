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
    <div className="p-6 md:p-10 max-w-[1400px] mx-auto animate-fade-in bg-white dark:bg-slate-950 min-h-screen">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest mb-10 text-slate-400 dark:text-slate-500 italic">
        <Link href="/" className="hover:text-brand-primary transition-colors">Directory Node</Link>
        <IoChevronForwardOutline size={12} className="text-slate-300" />
        <span className="text-slate-900 dark:text-slate-100">Personnel Profile</span>
      </nav>

      {/* Main Layout Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Profile Sidebar */}
        <aside className="lg:col-span-4 space-y-6">
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-sm text-center space-y-6 sticky top-10">
            <div className="relative inline-block group">
              <div className="w-32 h-32 rounded-[2.5rem] bg-brand-subtle text-brand-primary flex items-center justify-center text-4xl font-black shadow-xl mx-auto ring-4 ring-white dark:ring-slate-950 group-hover:scale-105 transition-transform duration-500">
                {employee.name.split(' ').map(n => n[0]).join('')}
              </div>
              <div className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-emerald-500 ring-4 ring-white dark:ring-slate-900 border-2 border-white dark:border-slate-800" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100 tracking-tight italic">{employee.name}</h1>
              <p className="text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{employee.designation}</p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <span className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full ${employee.status === 'active' ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 border border-slate-200 dark:border-slate-700'}`}>
                {employee.status}
              </span>
              <span className="text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full bg-brand-subtle text-brand-primary border border-brand-primary/10">
                {employee.department}
              </span>
            </div>

            <div className="pt-8 space-y-4">
              <button
                onClick={generatePaySlip}
                disabled={generatingPdf}
                className="w-full flex items-center justify-center gap-3 py-4 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl hover:scale-[1.03] active:scale-[0.98] transition-all disabled:opacity-50 ring-4 ring-slate-900/10 dark:ring-white/10"
              >
                {generatingPdf ? (
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white dark:border-slate-900/30 dark:border-t-slate-900 rounded-full animate-spin" />
                ) : (
                  <IoWalletOutline size={20} />
                )}
                {generatingPdf ? "Generating..." : "Generate Pay Entry"}
              </button>

              <button
                onClick={() => setIsEditModalOpen(true)}
                className="w-full py-4 bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded-2xl text-[11px] font-black uppercase tracking-widest border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 transition-all flex items-center justify-center gap-3 active:scale-[0.98]"
              >
                <IoCreateOutline size={20} className="text-brand-primary" />
                Override Attributes
              </button>

              <button
                onClick={() => setIsDeleteModalOpen(true)}
                className="w-full py-4 bg-rose-500/10 text-rose-600 dark:text-rose-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] border border-rose-500/20 hover:bg-rose-500 text-white transition-all flex items-center justify-center gap-3 active:scale-[0.98] mt-4"
              >
                <IoTrashOutline size={16} /> Retire Node
              </button>
            </div>
          </div>
        </aside>

        {/* Content Area */}
        <div className="lg:col-span-8 space-y-10">
          {/* Tabs Navigation */}
          <div className="flex border-b border-slate-100 dark:border-slate-800 gap-10 overflow-x-auto thin-scrollbar">
            {[
              { id: "overview", label: "Executive Info", icon: IoPersonOutline },
              { id: "attendance", label: "Attendance Log", icon: IoTimeOutline },
              { id: "activity", label: "Operation History", icon: IoStatsChartOutline },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`flex items-center gap-3 py-5 text-[11px] font-black uppercase tracking-[0.2em] border-b-4 transition-all whitespace-nowrap italic ${activeTab === tab.id ? 'border-brand-primary text-brand-primary' : 'border-transparent text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300'}`}
              >
                <tab.icon size={20} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
            {activeTab === "overview" && (
              <div className="space-y-12">
                {/* Personal Section */}
                <section className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Structural Identity</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {personalInfo.map((item, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center gap-5 group hover:border-brand-primary transition-all shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 group-hover:bg-brand-subtle group-hover:text-brand-primary transition-all shadow-inner">
                          <item.icon size={22} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{item.label}</p>
                          <p className="text-[13px] font-black text-slate-900 dark:text-slate-100">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Professional Section */}
                <section className="space-y-6">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Entity Credentials</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {professionalInfo.map((item, idx) => (
                      <div key={idx} className="bg-white dark:bg-slate-950 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 flex items-center gap-5 group hover:border-brand-primary transition-all shadow-sm">
                        <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-400 group-hover:bg-brand-subtle group-hover:text-brand-primary transition-all shadow-inner">
                          <item.icon size={22} />
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{item.label}</p>
                          <p className="text-[13px] font-black text-slate-900 dark:text-slate-100">{item.value}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            )}

            {activeTab === "attendance" && (
              <div className="space-y-8">
                <div className="flex items-center justify-between px-2">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 italic">30-Day Operational Log</h3>
                  <div className="flex items-center gap-6">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-lg shadow-emerald-500/20" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Satisfactory</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-lg shadow-rose-500/20" />
                    <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Deficit</span>
                  </div>
                </div>

                <div className="bg-white dark:bg-slate-950 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 border-b border-slate-100 dark:border-slate-800">
                        <th className="px-8 py-5">Temporal Index</th>
                        <th className="px-8 py-5">Status Code</th>
                        <th className="px-8 py-5">Synchronization</th>
                        <th className="px-8 py-5">Operational Note</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {loadingAttendance ? [1, 2, 3, 4, 5].map(i => <tr key={i}><td colSpan={4} className="px-8 py-6"><Skeleton className="h-6 w-full bg-slate-50 dark:bg-slate-900" /></td></tr>) :
                        attendanceHistory?.dates.map((date, idx) => {
                          const record = attendanceHistory.employees[0]?.attendance[date];
                          if (!record || record.status === 'unmarked') return null;
                          return (
                            <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors group">
                              <td className="px-8 py-5 text-[13px] font-black text-slate-900 dark:text-slate-100">{new Date(date).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                              <td className="px-8 py-5">
                                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${record.status === 'present' ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : 'bg-rose-500/10 text-rose-600 border-rose-500/20'}`}>
                                  {record.status}
                                </span>
                              </td>
                              <td className="px-8 py-5 text-[11px] font-black text-slate-500 dark:text-slate-400 font-mono uppercase tracking-widest">09:12 AM Sync</td>
                              <td className="px-8 py-5 text-[11px] font-bold text-slate-400 dark:text-slate-500 italic uppercase underline underline-offset-4 decoration-slate-200 dark:decoration-slate-800">{record.note || "Standard Operational Cycle"}</td>
                            </tr>
                          );
                        })
                      }
                      {!loadingAttendance && (!attendanceHistory || attendanceHistory.dates.length === 0) && (
                        <tr><td colSpan={4} className="px-8 py-16 text-center text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 italic">No historical nodes identified.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {activeTab === "activity" && (
              <div className="space-y-8">
                <h3 className="text-[11px] font-black uppercase tracking-[0.3em] text-slate-400 italic">Evolutionary Log</h3>
                <div className="space-y-10 pl-6 border-l-4 border-slate-100 dark:border-slate-800">
                  {[
                    { title: "Heuristic Profile Refined", date: "Just now", type: "system", desc: "Premium accessibility layers and high-contrast logic successfully integrated." },
                    { title: "Segment Allocation Updated", date: "2 days ago", type: "hr", desc: "Personnel node reassigned from General to Core Strategic Management." },
                    { title: "Entity Initialization", date: joinDate, type: "join", desc: "Core employee record synchronized with the master repository." },
                  ].map((item, idx) => (
                    <div key={idx} className="relative group">
                      <div className="absolute -left-[30px] top-1.5 w-5 h-5 rounded-full bg-white dark:bg-slate-950 border-4 border-brand-primary shadow-lg shadow-brand-primary/20 group-hover:scale-125 transition-transform duration-500" />
                      <div className="space-y-2">
                        <p className="text-[14px] font-black text-slate-900 dark:text-slate-100 italic tracking-tight">{item.title}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black uppercase tracking-widest">{item.date}</p>
                        <p className="text-[13px] font-bold text-slate-500 dark:text-slate-400 leading-relaxed max-w-2xl">{item.desc}</p>
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
