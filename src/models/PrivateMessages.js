const mongoose = require('mongoose');

const PrivateMessageSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 280
  },
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});


const PrivateMessages = mongoose.model('PrivateMessages', postSchema);

module.exports = PrivateMessages;