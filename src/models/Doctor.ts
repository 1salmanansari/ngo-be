import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IDoctor extends Document {
  id: string;
  doctorId: number;
  firstName: string;
  lastName: string;
  department: string;
  degree: string;
  hospital: string;
  created: number;
  updated: number;
}

const doctorSchema = new Schema<IDoctor>(
  {
    id: { type: String, default: uuidv4, unique: true, index: true },
    doctorId: { type: Number, unique: true, index: true },
    firstName: { type: String, required: true, trim: true },
    lastName: { type: String, required: true, trim: true },
    department: { type: String, required: true, index: true }, // Foreign Key to departments.id
    degree: { type: String, required: true, trim: true },
    hospital: { type: String, default: "" },
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

doctorSchema.pre("save", function (next) {
  this.updated = Date.now();
  next();
});

export const Doctor = mongoose.model<IDoctor>("Doctor", doctorSchema);
