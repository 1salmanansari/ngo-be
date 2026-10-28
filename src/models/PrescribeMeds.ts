import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IMed {
  id: string; // pharmacy.id
  qty: number;
}

export interface IPrescribeMeds extends Document {
  id: string;
  data: IMed[];
  patientId: number;
  doctorId?: number;
  created: number;
  updated: number;
}

const medItemSchema = new Schema<IMed>(
  {
    id: { type: String, required: true },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false },
);

const prescribeMedsSchema = new Schema<IPrescribeMeds>(
  {
    id: { type: String, default: uuidv4, unique: true, index: true },
    data: { type: [medItemSchema], required: true },
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

prescribeMedsSchema.pre("save", function (next) {
  this.updated = Date.now();
  next();
});

export const PrescribeMeds = mongoose.model<IPrescribeMeds>(
  "PrescribeMeds",
  prescribeMedsSchema,
);
