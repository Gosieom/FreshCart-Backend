import { IUser } from "../models/user.model"; // your user type/interface

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        fullName: string;
        email: string;
        phone?: string;
      };
    }
  }
}