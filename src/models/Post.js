const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    maxlength: 280
  },
  author: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }],
  comments: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Comment'
  }],
  parentPost: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Post'
  },
  isComment: {
    type: Boolean,
    default: false
  }
}, {
  timestamps: true
});

// Index pour améliorer les performances des requêtes
postSchema.index({ author: 1, createdAt: -1 });
postSchema.index({ parentPost: 1 });

const Post = mongoose.model('Post', postSchema);

module.exports = Post; 