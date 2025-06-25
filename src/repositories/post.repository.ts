import Post from "../models/Post";

export const postRepository = {
  async findById(postId: string) {
    if (!postId) {
      throw new Error('Post ID is required');
    }
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }
    return post;
  },

  async create(postData: any) {
    const post = await Post.create(postData);
    return post.save();
  },

  async update(postId: string, postData: any) {
    const post = await Post.findByIdAndUpdate(postId, postData, { new: true });
    if (!post) {
      throw new Error('Post not found');
    }
    return post?.save();
  },

  async delete(postId: string) {
    const post = await Post.findById(postId);
    if (!post) {
      throw new Error('Post not found');
    }
    return Post.findByIdAndDelete(postId);
  }
}
