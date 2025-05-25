import { type User } from "@shared/schema";

// DTO para resposta de usuário (sem senha)
export interface UserResponseDto {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'representative';
  active: boolean;
  approved: boolean;
  googleId: string | null;
  avatar: string | null;
  regionId: number | null;
  createdAt: Date | null;
  updatedAt: Date | null;
}

// DTO para registro de usuário
export interface RegisterUserDto {
  email: string;
  password: string;
  name: string;
  phone?: string | null;
  regionId?: number | null;
  createRegion?: boolean;
}

// DTO para criação de usuário pelo admin
export interface CreateUserDto {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'representative';
  active?: boolean;
  approved?: boolean;
  googleId?: string | null;
  avatar?: string | null;
  regionId?: number | null;
}

// DTO para atualização de usuário
export interface UpdateUserDto {
  email?: string;
  password?: string;
  name?: string;
  role?: 'admin' | 'representative';
  active?: boolean;
  approved?: boolean;
  googleId?: string | null;
  avatar?: string | null;
  regionId?: number | null;
  updateRegion?: boolean;
}

// DTO para resposta de registro
export interface RegisterResponseDto extends UserResponseDto {
  message: string;
}

// DTO para resposta de login
export interface LoginResponseDto extends UserResponseDto {}

// DTO para listagem de usuários
export interface UserListResponseDto {
  users: UserResponseDto[];
  total?: number;
}

// Função helper para converter User para UserResponseDto
export function toUserResponseDto(user: User): UserResponseDto {
  const { password, ...userWithoutPassword } = user;
  return userWithoutPassword;
}

// Função helper para converter array de Users para UserResponseDto[]
export function toUserResponseDtoArray(users: User[]): UserResponseDto[] {
  return users.map(toUserResponseDto);
} 