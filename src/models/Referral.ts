import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IReferral extends Document {
  id: string;
  patientId: number;
  doctorId: number;
  description: string;
  details: string;
  created: number;
  updated: number;
}

const referralSchema = new Schema<IReferral>(
  {
    id: { type: String, default: uuidv4, unique: true, index: true },
    patientId: { type: Number, required: true, index: true },
    doctorId: { type: Number, required: true, index: true },
    description: { type: String, required: true },
    details: { type: String, required: true },
    created: { type: Number, default: () => Date.now() },
    updated: { type: Number, default: () => Date.now() },
  },
  {
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as any)._id;
        return ret;
      },
    },
  },
);

referralSchema.pre("save", function (next) {
  this.updated = Date.now();
  next();
});

export const Referral = mongoose.model<IReferral>("Referral", referralSchema);
