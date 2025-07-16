// utils/notificationHelper.ts
import Notification from '../models/Notification';
import User from '../models/User';

export class NotificationHelper {
  static async createLikeNotification(postOwnerId: string, likerId: string, postId: string) {
    try {
      console.log('NotificationHelper.createLikeNotification appelé');
      console.log('- postOwnerId:', postOwnerId);
      console.log('- likerId:', likerId);
      console.log('- postId:', postId);
      
      if (postOwnerId === likerId) {
        console.log('Même utilisateur, pas de notification');
        return;
      }
      
      const existing = await Notification.findOne({
        recipient: postOwnerId,
        sender: likerId,
        type: 'like',
        post: postId
      });
      
      if (existing) {
        console.log('Notification like déjà existante:', existing);
        return existing;
      }
      
      console.log('Création de la notification like...');
      const notification = new Notification({
        recipient: postOwnerId,
        sender: likerId,
        type: 'like',
        post: postId,
        read: false
      });
      
      const savedNotification = await notification.save();
      console.log('Notification like sauvegardée:', savedNotification);
      return savedNotification;
    } catch (error) {
      console.error('Erreur création notification like:', error);
      return null;
    }
  }

  static async removeLikeNotification(postOwnerId: string, likerId: string, postId: string) {
    try {
      console.log('NotificationHelper.removeLikeNotification appelé');
      console.log('- postOwnerId:', postOwnerId);
      console.log('- likerId:', likerId);
      console.log('- postId:', postId);
      
      const result = await Notification.findOneAndDelete({
        recipient: postOwnerId,
        sender: likerId,
        type: 'like',
        post: postId
      });
      
      if (result) {
        console.log('Notification like supprimée:', result);
      } else {
        console.log('Aucune notification like trouvée à supprimer');
      }
    } catch (error) {
      console.error('Erreur suppression notification like:', error);
    }
  }

  static async createMentionNotification(mentionedUserId: string, mentionerId: string, postId: string) {
    try {
      console.log('NotificationHelper.createMentionNotification appelé');
      console.log('- mentionedUserId:', mentionedUserId);
      console.log('- mentionerId:', mentionerId);
      console.log('- postId:', postId);
      
      if (mentionedUserId === mentionerId) {
        console.log('Même utilisateur, pas de notification');
        return;
      }

      const existing = await Notification.findOne({
        recipient: mentionedUserId,
        sender: mentionerId,
        type: 'mention',
        post: postId
      });
      
      if (existing) {
        console.log('Notification mention déjà existante:', existing);
        return existing;
      }
      
      console.log('Création de la notification mention...');
      const notification = new Notification({
        recipient: mentionedUserId,
        sender: mentionerId,
        type: 'mention',
        post: postId,
        read: false
      });
      
      const savedNotification = await notification.save();
      console.log('Notification mention sauvegardée:', savedNotification);
      return savedNotification;
    } catch (error) {
      console.error('Erreur création notification mention:', error);
      return null;
    }
  }

  static async createFollowNotification(followedUserId: string, followerId: string) {
    try {
      console.log('NotificationHelper.createFollowNotification appelé');
      console.log('- followedUserId:', followedUserId);
      console.log('- followerId:', followerId);
      
      if (followedUserId === followerId) {
        console.log('Même utilisateur, pas de notification');
        return;
      }
      // Récupère le rôle du destinataire
      const recipientUser = await require('../models/User').default.findById(followedUserId).select('role');
      const role = recipientUser?.role?.toLowerCase();
      if (role && ['admin', 'moderateur', 'moderator'].some(r => role.includes(r))) {
        console.log('Pas de notification de follow pour le rôle:', role);
        return;
      }
      const existing = await Notification.findOne({
        recipient: followedUserId,
        sender: followerId,
        type: 'follow'
      });
      
      if (existing) {
        console.log('Notification follow déjà existante:', existing);
        return existing;
      }
      
      console.log('Création de la notification...');
      const notification = new Notification({
        recipient: followedUserId,
        sender: followerId,
        type: 'follow',
        read: false
      });
      
      const savedNotification = await notification.save();
      console.log('Notification follow sauvegardée:', savedNotification);
      return savedNotification;
    } catch (error) {
      console.error('Erreur création notification follow:', error);
      return null;
    }
  }

  static async removeFollowNotification(followedUserId: string, followerId: string) {
    try {
      console.log('NotificationHelper.removeFollowNotification appelé');
      console.log('- followedUserId:', followedUserId);
      console.log('- followerId:', followerId);
      
      const result = await Notification.findOneAndDelete({
        recipient: followedUserId,
        sender: followerId,
        type: 'follow'
      });
      
      if (result) {
        console.log('Notification follow supprimée:', result);
      } else {
        console.log('Aucune notification follow trouvée à supprimer');
      }
    } catch (error) {
      console.error('Erreur suppression notification follow:', error);
    }
  }

  static extractMentions(text: string): string[] {
    const mentionRegex = /@(\w+)/g;
    const mentions: string[] = [];
    let match;
    
    while ((match = mentionRegex.exec(text)) !== null) {
      mentions.push(match[1]);
    }
    
    return [...new Set(mentions)];
  }

  static async createMentionNotifications(postContent: string, postId: string, authorId: string) {
    try {
      const mentions = this.extractMentions(postContent);
      console.log('Mentions trouvées:', mentions);
      
      for (const username of mentions) {
        try {
          const mentionedUser = await User.findOne({ username });
          if (mentionedUser && mentionedUser._id.toString() !== authorId) {
            await this.createMentionNotification(mentionedUser._id.toString(), authorId, postId);
          }
        } catch (error) {
          console.error(`Erreur lors de la création de notification pour @${username}:`, error);
        }
      }
    } catch (error) {
      console.error('Erreur création notifications mentions:', error);
    }
  }
}