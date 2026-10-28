import mongoose, { Schema, Document } from "mongoose";
import { v4 as uuidv4 } from "uuid";

export type UserRole = "ADMIN" | "TEAM" | "VOLUNTEER" | "CUSTOMER";

export interface IUser extends Document {
  id: string;
  name: string;
  username: string;
  password: string;
  role: UserRole;
  created: number;
  updated: number;
}

const userSchema = new Schema<IUser>(
  {
    id: { type: String, default: uuidv4, unique: true, index: true },
    name: { type: String, required: true },
    username: {
      type: String,
      required: true,
      unique: true,
      minlength: 3,
      index: true,
      trim: true,
    },
    password: { type: String, required: true },
    role: {
      type: String,
      enum: ["ADMIN", "TEAM", "VOLUNTEER", "CUSTOMER"],
      default: "VOLUNTEER",
    },
    created: { type: Number, default: () => Date.now() },
    updated: { type: Number, default: () => Date.now() },
  },
  {
    versionKey: false,
    toJSON: {
      transform(_doc, ret) {
        delete (ret as any)._id;
        delete (ret as any).password;
        return ret;
      },
    },
  },
);

userSchema.pre("save", function (next) {
  this.updated = Date.now();
  next();
});

export const User = mongoose.model<IUser>("User", userSchema);
