import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IVitals {
  bp?: string;
  pulse?: number;
  tempreture?: number;
  spo2?: number;
  weight?: number;
  height?: number;
}

export interface IPatient extends Document {
  id: string;
  name: string;
  patientId: number;
  age: number;
  dob: number;
  mobile: number;
  gender: "MALE" | "FEMALE";
  address: string;
  complaint: string;
  department: string;
  doctorId?: number;
  author: string;
  vitals?: IVitals;
  hasTest: boolean;
  hasMeds: boolean;
  hasReferral: boolean;
  ratings?: number;
  created: number;
  updated: number;
}

const vitalsSchema = new Schema<IVitals>(
  {
    bp: { type: String, trim: true },
    pulse: { type: Number },
    tempreture: { type: Number },
    spo2: { type: Number },
    weight: { type: Number },
    height: { type: Number },
  },
  { _id: false },
);

const patientSchema = new Schema<IPatient>(
  {
    id: { type: String, default: uuidv4, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    patientId: { type: Number, unique: true, index: true },
    age: { type: Number, required: true },
    dob: { type: Number, default: 0 },
    mobile: { type: Number, required: true, index: true },
    gender: { type: String, required: true, enum: ["MALE", "FEMALE"] },
    address: { type: String, default: "" },
    complaint: { type: String, required: true },
    department: { type: String, required: true, index: true },
    doctorId: { type: Number, index: true },
    author: { type: String, required: true, index: true },
    vitals: { type: vitalsSchema, default: {} },
    hasTest: { type: Boolean, default: false },
    hasMeds: { type: Boolean, default: false },
    hasReferral: { type: Boolean, default: false },
    ratings: { type: Number, min: 1, max: 10 },
    created: { type: Number, default: () => Date.now(), index: true },
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

patientSchema.pre("save", function (next) {
  this.updated = Date.now();
  next();
});

export const Patient = mongoose.model<IPatient>("Patient", patientSchema);
