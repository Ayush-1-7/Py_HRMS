import mongoose from "mongoose";

const SettingSchema = new mongoose.Schema({
    companyName: { type: String, required: true, default: "NovaHR Enterprise" },
    companyLogo: { type: String },
    companyAddress: { type: String },
    taxPercentage: { type: Number, default: 10 },
    allowancesPercentage: { type: Number, default: 5 },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
}, { timestamps: true });

export default mongoose.models.Setting || mongoose.model("Setting", SettingSchema);
