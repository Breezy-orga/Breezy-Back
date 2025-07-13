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
      console.log('Repository: Tentative de suppression du message ID:', messageId);
      
      // Vérifier d'abord que le message existe
      const existingMessage = await PrivateMessage.findById(messageId);
      if (!existingMessage) {
        console.log('Repository: Message non trouvé:', messageId);
        throw new Error('Message not found');
      }

      console.log('Repository: Message trouvé, suppression en cours...', {
        messageId: existingMessage._id,
        senderId: existingMessage.senderId,
        content: existingMessage.content.substring(0, 50) + '...'
      });

      const result = await PrivateMessage.deleteOne({ _id: messageId });
      
      console.log('Repository: Résultat de la suppression:', {
        deletedCount: result.deletedCount,
        acknowledged: result.acknowledged,
        messageId: messageId
      });
      
      if (result.deletedCount === 0) {
        throw new Error('Message not found or already deleted');
      }

      console.log('Repository: Message supprimé avec succès');
      return true;
    } catch (error: any) {
      console.error('Repository: Error deleting private message', { 
        error: error.message, 
        messageId,
        stack: error.stack 
      });
      throw new Error('Could not delete private message: ' + error.message);
    }
  }
}