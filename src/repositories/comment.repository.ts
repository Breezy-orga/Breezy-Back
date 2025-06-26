import Comment from "../models/Comment";

export const commentRepository = {
    findById: async (id: string) => {
        const comment = await Comment.findById(id);
        if (!comment) {
            throw new Error('Comment not found');
        }
        return comment;
    },
    create: async (data: any) => {
        const comment = new Comment(data);
        await comment.save();
        return comment;
    },
    update: async (id: string, data: any) => {
        const comment = await Comment.findByIdAndUpdate(id, data, { new: true });
        if (!comment) {
            throw new Error('Comment not found');
        }
        return comment;
    },
    delete: async (id: string) => {
        const comment = await Comment.findByIdAndDelete(id);
        if (!comment) {
            throw new Error('Comment not found');
        }
        return comment;
    },
    deleteMany: async (filter: any) => {
        const result = await Comment.deleteMany(filter);
        return result;
    }
}