import { User } from "../models/user.model";

export const findUserByEmail = async (email: string) => {
  return User.findOne({ email });
};

export const createUser = async (user: any) => {
  return User.create(user);
};