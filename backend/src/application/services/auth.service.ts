import bcrypt from 'bcryptjs';
import { IUserRepository } from '../../domain/repositories/user.repository.interface';
import { User, CreateUserDTO } from '../../domain/entities/user.entity';

export class AuthService {
  constructor(private userRepository: IUserRepository) {}

  async register(userData: CreateUserDTO): Promise<User> {
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('User with this email already exists');
    }
    if (userData.password.length < 6) {
      throw new Error('Password must be at least 6 characters long');
    }

    const passwordHash = await bcrypt.hash(userData.password, 10);

    const user = await this.userRepository.create({
      email: userData.email.toLowerCase(),
      name: userData.name,
      passwordHash,
      city: userData.city,
      gender: userData.gender,
      preferences: null,
    });

    return user;
  }

  async login(email: string, password: string): Promise<User> {
    const user = await this.userRepository.findByEmail(email.toLowerCase());
    if (!user) {
      throw new Error('Invalid email or password');
    }

    const isValidPassword = await bcrypt.compare(password, user.passwordHash);
    if (!isValidPassword) {
      throw new Error('Invalid email or password');
    }

    return user;
  }

  async validateToken(userId: string): Promise<User | null> {
    return await this.userRepository.findById(userId);
  }
}