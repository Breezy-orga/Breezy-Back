import User from '../models/User';
import { UserRepository } from '../repositories/userRepository';
import mongoose from 'mongoose';

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

  static async updateProfile(userId: string, updateData: any) {
    try {
      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }
      const { name, bio, profilePicture } = updateData;

      if (name && 'name' in user) (user as any).name = name;
      if (bio) user.bio = bio;
      if (profilePicture) user.profilePicture = profilePicture;

      await user.save();
      return user;
    } catch (error) {
      console.error('Error fetching user profile', { error });
      throw new Error('Failed to fetch user profile');
    }
  }

  static async isFollowing(currentUserId: string, targetUserId: string) {
    try {
      const currentUser = await UserRepository.findById(currentUserId);
      if (!currentUser) {
        throw new Error('Utilisateur non trouvé');
      }

      const isFollowing = currentUser.following.some(id => id.toString() === targetUserId);
      return isFollowing;
    } catch (error) {
      console.error('Error checking follow status', { error });
      throw new Error('Failed to check follow status');
    }
  }

  static async followUser(currentUserId: string, targetUserId: string) {
    try {
      if (currentUserId === targetUserId) {
        throw new Error('Vous ne pouvez pas vous suivre vous-même');
      }

      const userToFollow = await User.findById(targetUserId);
      const currentUser = await User.findById(currentUserId);

      if (!userToFollow || !currentUser) {
        throw new Error('Utilisateur non trouvé');
      }

      const isFollowing = currentUser.following.some(id => id.toString() === targetUserId);

      if (isFollowing) {
        // Ne plus suivre
        currentUser.following = currentUser.following.filter(
          id => id.toString() !== targetUserId
        );
        userToFollow.followers = userToFollow.followers.filter(
          id => id.toString() !== currentUserId
        );
      } else {
        // Suivre
        currentUser.following.push(new mongoose.Types.ObjectId(targetUserId));
        userToFollow.followers.push(new mongoose.Types.ObjectId(currentUserId));
      }
      return { currentUser, userToFollow };
    } catch (error) {
      console.error('Error following user', { error });
      throw new Error('Failed to follow/unfollow user');
    }
  }

  static async getSuggestions(userId: string) {
    const currentUser = await UserRepository.findById(userId);
    if (!currentUser) {
      throw new Error('Utilisateur non trouvé');
    }

    const users = await User.find({
      _id: {
        $nin: [...currentUser.following, userId]
      }
    })
    .select('username name profilePicture')
    .limit(5);
    return users;
  }

  static async getTheme(userId: string) {
    try {
      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }
      return user;
    } catch (error) {
      console.error('Error fetching user theme', { error });
      throw new Error('Failed to fetch user theme');
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
  
  static async changeTheme(userId: string, theme: 'light' | 'dark') {
    try{
      // Vérifier que le thème est valide
      if (theme !== 'light' && theme !== 'dark') {
        throw new Error('Le thème doit être "light" ou "dark"');
      }

      const user = await UserRepository.findById(userId);
      if (!user) {
        throw new Error('Utilisateur non trouvé');
      }
      
      // Mettre à jour le thème utilisateur
      user.theme = theme;
      await user.save();
      return user;
    } catch (error) {
      console.error('Error changing user theme', { error });
      throw new Error('Failed to change user theme');
    }
  }
}