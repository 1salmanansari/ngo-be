import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export interface IDepartment extends Document {
  id: string;
  name: string;
  created: number;
  updated: number;
}

const departmentSchema = new Schema<IDepartment>(
  {
    id: { type: String, default: uuidv4, unique: true, index: true },
    name: { type: String, required: true, trim: true },
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

departmentSchema.pre("save", function (next) {
  this.updated = Date.now();
  next();
});

export const Department = mongoose.model<IDepartment>(
  "Department",
  departmentSchema,
);
