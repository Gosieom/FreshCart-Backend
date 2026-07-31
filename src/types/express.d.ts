declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        fullName: string;
        email: string;
        phone?: string;
        profileImage?: string;
        createdAt?: Date;
      };
    }
  }
}

export {};