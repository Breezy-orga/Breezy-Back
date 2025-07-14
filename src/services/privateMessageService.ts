import { PrivateMessagesRepository } from '../repositories/privateMessage.repository';

export class PrivateMessageService {
  static async createPrivateMessage(senderId: string, receiverId: string, content: string) {
    try {
      const message = await PrivateMessagesRepository.createPrivateMessage(senderId, receiverId, content);
      return message;
    } catch (error) {
      console.error('Error creating private message', { error });
      throw new Error('Could not create private message');
    }
  }

  static async getMessagesWith(senderId: string, receiverId: string) {
    try {
      const messages = await PrivateMessagesRepository.getMessagesWith(senderId, receiverId);
      return messages;
    } catch (error) {
      console.error('Error fetching private messages', { error, senderId, receiverId });
      throw new Error('Could not fetch private messages');
    }
  }

  static async deleteMessage(messageId: string) {
    try {
      const result = await PrivateMessagesRepository.deleteMessage(messageId);
      return result;
    } catch (error) {
      console.error('Error deleting private message', { error, messageId });
      throw new Error('Could not delete private message');
    }
  }
}