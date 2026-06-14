export type UserRole =
  | 'SUPER_ADMIN'
  | 'LEGAL_ADMIN'
  | 'CONTRACT_MANAGER'
  | 'REVIEWER'
  | 'AUDITOR'
  | 'VIEWER';

export interface IUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface IAuthToken {
  accessToken: string;
  refreshToken?: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface ILoginPayload {
  email: string;
  password: string;
}
