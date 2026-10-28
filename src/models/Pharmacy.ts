import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IPharmacy extends Document {
  id: string;
  name: string;
  qty: number;
  created: number;
  updated: number;
}

const pharmacySchema = new Schema<IPharmacy>(
  {
    id: { type: String, default: uuidv4, unique: true, index: true },
    name: { type: String, required: true, trim: true },
    qty: { type: Number, default: 0 },
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

pharmacySchema.pre("save", function (next) {
  this.updated = Date.now();
  next();
});

export const Pharmacy = mongoose.model<IPharmacy>("Pharmacy", pharmacySchema);
