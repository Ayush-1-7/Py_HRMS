import mongoose, { Schema, Document, Model } from "mongoose";

/* ── Status Enum ─────────────────────────────────────────── */
export const ATTENDANCE_STATUSES = [
  "unmarked",
  "present",
  "absent",
] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface IAttendance extends Document {
  employee: mongoose.Types.ObjectId; // ref: Employee
  date: Date;                        // normalized to midnight UTC (YYYY-MM-DD 00:00:00Z)
  status: AttendanceStatus;
  note?: string;
  createdAt: Date;
  updatedAt: Date;
}

/* ── Schema ──────────────────────────────────────────────── */
const AttendanceSchema = new Schema<IAttendance>(
  {
    employee: {
      type: Schema.Types.ObjectId,
      ref: "Employee",
      required: true,
      index: true,
    },
    date: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ATTENDANCE_STATUSES,
      default: "unmarked",
    },
    note: { type: String, trim: true, maxlength: 200 },
  },
  { timestamps: true }
);

/* one record per employee per calendar day */
AttendanceSchema.index({ employee: 1, date: 1 }, { unique: true });
/* fast range queries across date span */
AttendanceSchema.index({ date: 1, status: 1 });

const Attendance: Model<IAttendance> =
  mongoose.models.Attendance ??
  mongoose.model<IAttendance>("Attendance", AttendanceSchema);

export default Attendance;
