import { storage } from "../repositories";
import { hashPassword } from "./auth";
import { type InsertUser, type User } from "@shared/schema";
import { z } from "zod";
import { emitEvent } from "./eventEmitter";
import { 
  UserResponseDto, 
  RegisterUserDto, 
  CreateUserDto, 
  UpdateUserDto,
  toUserResponseDto
} from "../dtos/user.dto";

export class UserService {
  async registerUser(data: RegisterUserDto): Promise<UserResponseDto> {
    // Verificar se o usuário já existe
    const existingUser = await storage.user.getUserByEmail(data.email);
    if (existingUser) {
      throw new Error("Este email já está em uso");
    }

    // Hash da senha
    const hashedPassword = await hashPassword(data.password);

    // Preparar dados do usuário
    const userData: InsertUser = {
      email: data.email,
      name: data.name,
      phone: data.phone || null,
      regionId: data.regionId || null,
      role: 'representative' as const,
      approved: false,
      password: hashedPassword,
    };

    // Criar região se necessário
    if (data.createRegion) {
      try {
        const newRegion = await storage.region.createRegion({ name: data.name });
        userData.regionId = newRegion.id;
      } catch (regionError) {
        console.error("Erro ao criar região:", regionError);
        throw new Error("Erro ao criar região para o usuário");
      }
    }

    // Criar usuário
    const user = await storage.user.createUser(userData);
    
    // Converter para DTO
    const userResponseDto = toUserResponseDto(user);
    
    // Emitir evento de novo usuário registrado
    emitEvent('user.registered', { user: userResponseDto });
    
    return userResponseDto;
  }

  async createUserByAdmin(data: CreateUserDto): Promise<UserResponseDto> {
    // Verificar se o usuário já existe
    const existingUser = await storage.user.getUserByEmail(data.email);
    if (existingUser) {
      throw new Error("Email already in use");
    }

    // Hash da senha
    const hashedPassword = await hashPassword(data.password);

    let user: User;

    // Se for representante, criar região automaticamente
    if (data.role === 'representative') {
      const region = await storage.region.createRegion({
        name: data.name,
        description: `Região de ${data.name}`,
      });
      
      user = await storage.user.createUser({
        ...data,
        password: hashedPassword,
        regionId: region.id,
      });
      
      console.log(`Região ${region.name} (ID: ${region.id}) criada para representante ${user.name} (ID: ${user.id})`);
    } else {
      user = await storage.user.createUser({
        ...data,
        password: hashedPassword,
      });
    }

    return toUserResponseDto(user);
  }

  async updateUserByAdmin(id: number, data: UpdateUserDto): Promise<UserResponseDto> {
    const currentUser = await storage.user.getUser(id);
    if (!currentUser) {
      throw new Error("User not found");
    }

    // Verificar email duplicado
    if (data.email && data.email !== currentUser.email) {
      const existingUser = await storage.user.getUserByEmail(data.email);
      if (existingUser) {
        throw new Error("Email already in use");
      }
    }

    // Hash da senha se fornecida
    let updateData: Partial<InsertUser> = { ...data };
    if (data.password) {
      updateData.password = await hashPassword(data.password);
    }

    let updatedUser: User | undefined;

    // Atualizar região se necessário
    if (data.updateRegion && data.role === 'representative' && data.name) {
      const region = await storage.region.createRegion({
        name: data.name,
        description: `Região de ${data.name}`,
      });
      
      updatedUser = await storage.user.updateUser(id, {
        ...updateData,
        regionId: region.id,
      });
    } else {
      updatedUser = await storage.user.updateUser(id, updateData);
    }

    if (!updatedUser) {
      throw new Error("Failed to update user");
    }

    return toUserResponseDto(updatedUser);
  }

  async approveUser(userId: number): Promise<UserResponseDto> {
    const updatedUser = await storage.user.updateUser(userId, { approved: true });
    if (!updatedUser) {
      throw new Error("Usuário não encontrado");
    }
    
    const userResponseDto = toUserResponseDto(updatedUser);
    
    // Emitir evento de usuário aprovado
    emitEvent('user.approved', { user: userResponseDto });
    
    return userResponseDto;
  }

  async getUsersWithoutPassword(): Promise<UserResponseDto[]> {
    const users = await storage.user.listUsers();
    return users.map(toUserResponseDto);
  }

  async getPendingUsersWithoutPassword(): Promise<UserResponseDto[]> {
    const pendingUsers = await storage.user.getPendingUsers();
    return pendingUsers.map(toUserResponseDto);
  }

  async getRepresentativesWithoutPassword(): Promise<UserResponseDto[]> {
    const representatives = await storage.user.listRepresentatives();
    return representatives.map(toUserResponseDto);
  }

  async getUserByIdWithoutPassword(id: number): Promise<UserResponseDto | null> {
    const user = await storage.user.getUser(id);
    if (!user) return null;
    return toUserResponseDto(user);
  }

  async deleteUser(id: number): Promise<void> {
    const success = await storage.user.deleteUser(id);
    if (!success) {
      throw new Error("Usuário não encontrado");
    }
    
    // Emitir evento de usuário deletado
    emitEvent('user.deleted', { userId: id });
  }
}

// Exportar instância singleton
export const userService = new UserService(); 