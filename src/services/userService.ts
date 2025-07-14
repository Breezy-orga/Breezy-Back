import { postRepository } from '../repositories/post.repository';
import User from '../models/User';
import { UserRepository } from '../repositories/user.repository';
import mongoose from 'mongoose';
import { commentRepository } from '../repositories/comment.repository';

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
        const user = await User.findById(userId)
          .select('-password');
          
        return user;
      }
    } catch (error) {
      console.error('Error fetching user by ID', { error });
      throw new Error('Failed to fetch user');
    }
  }

  static async getUsersByIds(ids: string[]){
    try{
      if (ids.length === 0) return [];
      const users = await User.find({_id: { $in: ids}})
        .select('_id username name profilePicture');
      return users;
    } catch (error) {
      console.error('Error fetching users by IDs', { error });
      throw new Error('Failed to fetch users');
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
      await postRepository.deleteMany({ author: userId });
      await commentRepository.deleteMany({ author: userId });
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

      if (name !== undefined) user.name = name; // Permettre les chaînes vides
      if (bio !== undefined) user.bio = bio;
      if (profilePicture) user.profilePicture = profilePicture;

      await user.save();
      return user;
    } catch (error) {
      console.error('Error updating user profile', { error });
      throw new Error('Failed to update user profile');
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
        throw new Error("you can't follow yourself");
      }
      console.log('Attempting to follow user with ID:', targetUserId, 'by user:', currentUserId);
      const userToFollow = await UserRepository.findById(targetUserId);
      const currentUser = await UserRepository.findById(currentUserId);
      console.log('User to follow:', userToFollow);
      console.log('Current user:', currentUser);
      if (!userToFollow || !currentUser) {
        throw new Error('User not found');
      }

      const isFollowing = currentUser.following.some(id => id.toString() === targetUserId);
      console.log('Is following:', isFollowing, 'Current user following:', currentUser.following, 'Target user followers:', userToFollow.followers);
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

      // Sauvegarder les modifications
      await currentUser.save();
      await userToFollow.save();

      return { currentUser, userToFollow };
    } catch (error) {
      console.error('Error following user', { error });
      throw new Error('Failed to follow/unfollow user');
    }
  }

  static async unfollowUser(currentUserId: string, targetUserId: string) {
    try {
      if (currentUserId === targetUserId) {
        throw new Error("you can't unfollow yourself");
      }

      const userToUnfollow = await UserRepository.findById(targetUserId);
      const currentUser = await UserRepository.findById(currentUserId);

      if (!userToUnfollow || !currentUser) {
        throw new Error('User not found');
      }

      const isFollowing = currentUser.following.some(id => id.toString() === targetUserId);

      if (isFollowing) {
        // Remove following/follower relationship
        currentUser.following = currentUser.following.filter(
          id => id.toString() !== targetUserId
        );
        userToUnfollow.followers = userToUnfollow.followers.filter(
          id => id.toString() !== currentUserId
        );

        // Sauvegarder les modifications
        await currentUser.save();
        await userToUnfollow.save();
      }
      // If not following, do nothing

      return { currentUser, userToUnfollow };
    } catch (error) {
      console.error('Error unfollowing user', { error });
      throw new Error('Failed to unfollow user');
    }
  }

  static async getSuggestions(userId: string) {
    try {
      const currentUser = await UserRepository.findById(userId);
      if (!currentUser) {
        throw new Error('User not found');
      }

      const followingIds = currentUser.following.map((id: mongoose.Types.ObjectId) => id.toString());

      const users = await UserRepository.getSuggestions(userId, followingIds);
      console.log('Suggestions fetched successfully', { users });
      return users;
    } catch (error) {
      console.error('Error fetching suggestions', { error });
      throw new Error('Failed to fetch suggestions');
    }
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

  static async getUserByUsernamesUnlessIds(usernames: string, unlessIds: string[]) {
    try {
      const users = await UserRepository.findByUsernamesUnlessIds(usernames, unlessIds);
      return users;
    } catch (error) {
      console.error('Error fetching users by usernames unless IDs', { error });
      throw new Error('Failed to fetch users');
    }
  }

  static async getUserByIdSelectAndPopulate(userId: string, select: string = '', populate: string[] = []) {
    try {
      const user = await UserRepository.getUserByIdSelectAndPopulate(userId, select, populate);
      return user;
    } catch (error) {
      console.error('Error fetching user by ID select and populate', { error });
      throw new Error('Failed to fetch user');
    }
  }
}