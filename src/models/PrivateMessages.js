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
  // The timestamps option automatically adds createdAt and updatedAt fields to the schema
    timestamps: true
});


const PrivateMessages = mongoose.model('PrivateMessages', PrivateMessageSchema);

module.exports = PrivateMessages;