import mongoose, { Schema, Document, Model } from "mongoose";
import { DEPARTMENTS, type Department } from "@/lib/departments";

export type Role = "Admin" | "HR Manager" | "Employee";
export type EmploymentType = "Full-time" | "Part-time" | "Contract";

export interface IEmployee extends Document {
  id: number;
  employeeId: string;
  name: string;
  email: string;
  department: Department;
  designation: string;
  phone?: string;
  joiningDate: Date;
  status: "active" | "inactive" | "probation" | "on leave";
  role: Role;
  password?: string;
  photo?: string;
  employmentType: EmploymentType;
  salary?: number;
  emergencyContact?: {
    name: string;
    phone: string;
    relation: string;
  };
  address?: string;
  createdAt: Date;
  updatedAt: Date;
}

const EmployeeSchema = new Schema<IEmployee>(
  {
    id: { type: Number, required: true, unique: true },
    employeeId: { type: String, required: true, unique: true },
    name: { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    department: {
      type: String,
      required: true,
      enum: DEPARTMENTS,
      trim: true,
    },
    designation: { type: String, required: true, trim: true },
    phone: { type: String, trim: true },
    joiningDate: { type: Date, required: true, default: Date.now },
    status: {
      type: String,
      enum: ["active", "inactive", "probation", "on leave"],
      default: "active"
    },
    role: { type: String, enum: ["Admin", "HR Manager", "Employee"], default: "Employee" },
    password: { type: String, select: false },
    photo: { type: String },
    employmentType: { type: String, enum: ["Full-time", "Part-time", "Contract"], default: "Full-time" },
    salary: { type: Number },
    emergencyContact: {
      name: { type: String },
      phone: { type: String },
      relation: { type: String },
    },
    address: { type: String },
  },
  { timestamps: true }
);

/* search-friendly indexes */
EmployeeSchema.index({ name: 1 });
EmployeeSchema.index({ department: 1 });
EmployeeSchema.index({ status: 1 });

const Employee: Model<IEmployee> =
  mongoose.models.Employee ??
  mongoose.model<IEmployee>("Employee", EmployeeSchema);

export default Employee;
