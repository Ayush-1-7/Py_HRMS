"use client";

import { useEffect, useRef } from "react";
import { IoCloseOutline } from "react-icons/io5";
import type { IEmployee } from "@/models/Employee";
import AddEmployeeForm from "./AddEmployeeForm";

interface EmployeeModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editData?: IEmployee | null;
}

export default function EmployeeModal({
  open,
  onClose,
  onSuccess,
  editData,
}: EmployeeModalProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const isEdit = !!editData;
  const title = isEdit ? "Update Personnel Profile" : "Expand Global Workforce";

  /* Lock/Unlock scroll */
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => { document.body.style.overflow = "auto"; };
  }, [open]);

  /* close on backdrop click */
  const handleOverlay = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  if (!open) return null;

  return (
    <div
      ref={overlayRef}
      onMouseDown={handleOverlay}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
    >
      <div className="relative w-full max-w-4xl max-h-[90vh] bg-white dark:bg-slate-950 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-200 dark:border-slate-800">

        {/* Header */}
        <div className="flex items-center justify-between px-8 py-6 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
              {title}
            </h2>
            <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-1">
              {isEdit ? "Update profile details and credentials" : "Confirm new employee onboarding and identity"}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 dark:text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 transition-all active:scale-95"
          >
            <IoCloseOutline size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto thin-scrollbar px-8 py-2">
          <AddEmployeeForm
            onSuccess={onSuccess}
            onCancel={onClose}
            editData={editData}
          />
        </div>
      </div>
    </div>
  );
}
