const PrivateMessagesModel = require("../models/PrivateMessages");

PrivateMessagesModel.createPrivateMessage = async function (senderId, receiverId, content) {
  try {
    const message = new PrivateMessagesModel({
      content,
      sender: senderId,
      receiver: receiverId
    });

    await message.save();
    await message.populate('sender', 'username profilePicture');
    await message.populate('receiver', 'username profilePicture');

    return message;
  } catch (error) {
    throw new Error('Could not create private message');
  }
};




PrivateMessagesModel.getMessagesWith = async function (sender, receiver) {
  try {
    const messages = await PrivateMessagesModel.find({
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
    logger.error('Error fetching private messages', { error, sender, receiver });
    throw new Error('Could not fetch private messages');
  }
};

PrivateMessagesModel.deleteMessage = async function (messageId) {
  try {
    const result = await PrivateMessagesModel.deleteOne({ _id: messageId });
    if (result.deletedCount === 0) {
      throw new Error('Message not found');
    }
    return true;
  } catch (error) {
    logger.error('Error deleting private message', { error, messageId });
    throw new Error('Could not delete private message');
  }
};
