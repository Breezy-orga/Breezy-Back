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

  async getMessagesWith(sender: string, receiver: string): Promise<IPrivateMessage[]> {
    try {
      const messages = await PrivateMessage.find({
        $or: [
          { sender: sender, receiver: receiver },
          { sender: receiver, receiver: sender }
        ]
      })
      .populate('sender', 'username profilePicture')
      .populate('receiver', 'username profilePicture')
      .sort({ createdAt: -1 });
      return messages;
    } catch (error) {
      console.error('Error fetching private messages', { error, sender, receiver });
      throw new Error('Could not fetch private messages');
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