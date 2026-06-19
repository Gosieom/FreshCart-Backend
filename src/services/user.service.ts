import bcrypt from "bcryptjs";
import { RegisterUserDto, LoginUserDto } from "../dtos/user.dto";
import { UserModel } from "../models/user.model";
import { generateToken } from "../utils/generateToken";
import { HttpException } from "../exceptions/httpException";

export const registerUserService = async (data: RegisterUserDto) => {
  const existingUser = await UserModel.findOne({ email: data.email });

  if (existingUser) {
    throw new HttpException(400, "Email already exists");
  }

  const hashedPassword = await bcrypt.hash(data.password, 10);

  const user = await UserModel.create({
    ...data,
    password: hashedPassword,
  });

  return {
    id: user._id,
    fullName: user.fullName,
    email: user.email,
    phone: user.phone,
    profileImage: user.profileImage,
  };
};

export const loginUserService = async (data: LoginUserDto) => {
  const user = await UserModel.findOne({ email: data.email });

  if (!user) {
    throw new HttpException(401, "Invalid credentials");
  }

  const isMatch = await bcrypt.compare(data.password, user.password);

  if (!isMatch) {
    throw new HttpException(401, "Invalid credentials");
  }

  const token = generateToken(user._id.toString());

  return {
    user: {
      id: user._id,
      fullName: user.fullName,
      email: user.email,
      phone: user.phone,
      profileImage: user.profileImage,
    },
    token,
  };
};