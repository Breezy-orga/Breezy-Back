import { UserRepository } from '../repositories/userRepository';

export class userService {

  static async getUserByEmail(email: string) {
    try {
      const user = await UserRepository.findByEmail(email);
      return user;
    } catch (error) {
      console.error('Error fetching user by email', { error });
      throw new Error('Failed to fetch user');
    }
  }

  static async getUserById(userId: string | null) {
    try {
      if (!userId) {
        throw new Error('User not found');
      } else {
        const user = await UserRepository.findById(userId);
        return user;
      }
    } catch (error) {
      console.error('Error fetching user by ID', { error });
      throw new Error('Failed to fetch user');
    }
  }

  static async updateUser(userId: string, updateData: any) {
    try {
      const updatedUser = await UserRepository.updateUser(userId, updateData);
      return updatedUser;
    } catch (error) {
      console.error('Error updating user', { error });
      throw new Error('Failed to update user');
    }
  }

  static async deleteUser(userId: string) {
    try {
      const result = await UserRepository.deleteUser(userId);
      return result;
    } catch (error) {
      console.error('Error deleting user', { error });
      throw new Error('Failed to delete user');
    }
  }
    static async getAllUsers() {
        try {
        const users = await UserRepository.findAll();
        console.log('All users fetched successfully', { users });
        return users;
        } catch (error) {
        console.error('Error fetching all users', { error });
        throw new Error('Failed to fetch users');
        }
    }
    
}