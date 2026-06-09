export interface RegisterUserDto {
  fullName: string;
  email: string;
  password: string;
  phone?: string;  // make it optional if you want
}

export interface LoginUserDto {
  email: string;
  password: string;
}