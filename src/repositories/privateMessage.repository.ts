import PrivateMessage, { IPrivateMessage } from '../models/PrivateMessages';


export const PrivateMessagesRepository = {
  // Exemple de création
  async createPrivateMessage(senderId: string, receiverId: string, content: string): Promise<IPrivateMessage> {
    const message = new PrivateMessage({
      senderId,
      receiverId,
      content
    });
    await message.save();
    return message;
  },

  async getMessagesWith(userId1: string, userId2: string): Promise<IPrivateMessage[]> {
    try {
      const messages = await PrivateMessage.find({
        $or: [
          { senderId: userId1, receiverId: userId2 },
          { senderId: userId2, receiverId: userId1 }
        ]
      })
        .populate('senderId', 'username profilePicture')
        .populate('receiverId', 'username profilePicture')
        .sort({ timestamp: 1 }) // tri chronologique (le plus logique)
      return messages
    } catch (error) {
      console.error('Error fetching private messages', { error, userId1, userId2 })
      throw new Error('Could not fetch private messages')
    }
  },

  async deleteMessage(messageId: string): Promise<boolean> {
    try {
      const result = await PrivateMessage.deleteOne({ _id: messageId });
      if (result.deletedCount === 0) {
        throw new Error('Message not found');
      }
      return true;
    } catch (error) {
      console.error('Error deleting private message', { error, messageId });
      throw new Error('Could not delete private message');
    }
  }
}