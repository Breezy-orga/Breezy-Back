const PrivateMessagesRepository = require('../repositories/privateMessageRepository');
const logger = require('../utils/logger'); // Assuming logger is set up in utils/logger.js

class PrivateMessageService {
  static async createPrivateMessage(senderId, receiverId, content) {
    try {
      const message = await PrivateMessagesRepository.createPrivateMessage(senderId, receiverId, content);
      return message;
    } catch (error) {
      logger.error('Error creating private message', { error });
      throw new Error('Could not create private message');
    }
  }

  static async getMessagesWith(senderId, receiverId) {
    try {
      const messages = await PrivateMessagesRepository.getMessagesWith(senderId, receiverId);
      return messages;
    } catch (error) {
      logger.error('Error fetching private messages', { error, senderId, receiverId });
      throw new Error('Could not fetch private messages');
    }
  }

  static async deleteMessage(messageId) {
    try {
      const result = await PrivateMessagesRepository.deleteMessage(messageId);
      return result;
    } catch (error) {
      logger.error('Error deleting private message', { error, messageId });
      throw new Error('Could not delete private message');
    }
  }
}