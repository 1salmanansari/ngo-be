import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IPrescribeTest extends Document {
  id: string;
  data: string[];
  patientId: number;
  doctorId?: number;
  created: number;
  updated: number;
}

const prescribeTestSchema = new Schema<IPrescribeTest>(
  {
    id: { type: String, default: uuidv4, unique: true, index: true },
    data: { type: [String], required: true },
    patientId: { type: Number, required: true, index: true },
    doctorId: { type: Number, index: true },
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

prescribeTestSchema.pre("save", function (next) {
  this.updated = Date.now();
  next();
});

export const PrescribeTest = mongoose.model<IPrescribeTest>(
  "PrescribeTest",
  prescribeTestSchema,
);
