import { UserRepository } from '../repositories/userRepository';
import jwt from 'jsonwebtoken';

export class AuthService {
  static async login(email: string, password: string) {
    try {
      console.log('Login attempt with email:', email);
      const user = await UserRepository.findByEmail(email);
      if (!user) {
        throw new Error('User not found');
      }

      const isPasswordValid = await UserRepository.comparePassword(user, password);
      if (!isPasswordValid) {
        throw new Error('Invalid password');
      }

      return user;
    } catch (error) {
      console.error('Error during login', { error });
      throw new Error('Login failed');
    }
  }

  static async register(username: string, email: string, password: string) {
    try {
      const existingUser = await UserRepository.findByEmail(email);
      if (existingUser) {
        throw new Error('Email already in use');
      }

      const user = await UserRepository.createUser(username, email, password);
      return user;
    } catch (error) {
      console.error('Error during registration', { error });
      throw new Error('Registration failed');
    }
  }

  static async getUserById(userId: string | null) {
    try {
      if (!userId) {
        throw new Error('User not found');
      }
      else{
        const user = await UserRepository.findById(userId);
        return user;
      }

    } catch (error) {
      console.error('Error fetching user by ID', { error });
      throw new Error('Failed to fetch user');
    }
  }

  static generateToken(user: any) {
    // Générer le token
    const token = jwt.sign(
      { userId: user._id },
      process.env.JWT_SECRET || 'fallback_secret',
      { expiresIn: '24h' }
    );
    return token;
  }
}