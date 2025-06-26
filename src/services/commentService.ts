import mongoose from "mongoose";
import { commentRepository } from "../repositories/comment.repository";

export class CommentService {
    static async getCommentById(commentId: string) {
        try {
            const comment = await commentRepository.findById(commentId);
            return comment;
        } catch (error) {
            console.error('Error fetching comment by ID', { error });
            throw new Error('Failed to fetch comment');
        }
    }

    static async createComment(data: any) {
        try {
            const comment = await commentRepository.create(data);
            return comment;
        } catch (error) {
            console.error('Error creating comment', { error });
            throw new Error('Failed to create comment');
        }
    }

    static async updateComment(commentId: string, data: any) {
        try {
            const comment = await commentRepository.update(commentId, data);
            return comment;
        } catch (error) {
            console.error('Error updating comment', { error });
            throw new Error('Failed to update comment');
        }
    }

    static async deleteComment(commentId: string) {
        try {
            const comment = await commentRepository.delete(commentId);
            return comment;
        } catch (error) {
            console.error('Error deleting comment', { error });
            throw new Error('Failed to delete comment');
        }
    }

    static async updateCommentSchemaWithMedia(commentId: string, userId: string, mediaData: any) {
        try {
            
            if (!userId) {
                throw new Error('Utilisateur non authentifié');
            }

            if (!mongoose.Types.ObjectId.isValid(commentId)) {
                throw new Error('ID de commentaire invalide');
            }

            const comment = await commentRepository.findById(commentId);

            if (!comment) {
                throw new Error('Commentaire non trouvé');
            }

            // Vérifier si l'utilisateur est l'auteur du commentaire
            if (comment.author.toString() !== userId) {
                throw new Error('Non autorisé à modifier ce commentaire');
            }

            // Limiter à 4 médias maximum comme pour les posts
            if (Array.isArray(mediaData) && mediaData.length > 4) {
                throw new Error('Maximum 4 médias par commentaire');
            }
        }
        catch (error) {
            console.error('Erreur lors de la mise à jour du commentaire avec des médias', { error
            });
        }
            
            // Validation du format des médias
            if (!Array.isArray(mediaData) || !mediaData.every(m => m.base64 && m.contentType)) {
                throw new Error('Format de médias invalide');
            }

            // Mise à jour du commentaire avec les médias
            const updatedComment = await commentRepository.update(commentId, { media: mediaData });
            return updatedComment;
        }

    static async likeComment(commentId: string, userId: string) {
        try {            
            if (!userId) {
                throw new Error('Utilisateur non authentifié');
            }

            if (!mongoose.Types.ObjectId.isValid(commentId)) {
                throw new Error('ID de commentaire invalide');
            }

            const comment = await commentRepository.findById(commentId);

            if (!comment) {
                throw new Error('Commentaire non trouvé');
            }

            // Vérifier si l'utilisateur a déjà liké ce commentaire
            const isLiked = comment.likes.some(like => 
            like.toString() === userId
            );

            if (isLiked) {
            // Retirer le like
            await commentRepository.update(commentId, {
                $pull: { likes: userId }
            });
            } else {
            // Ajouter le like
            await commentRepository.update(commentId, {
                $addToSet: { likes: userId }
            });
            }
            // Retourner l'état du like et le nombre de likes
            return {
                liked: !isLiked,
                likesCount: isLiked ? comment.likes.length - 1 : comment.likes.length + 1
            };
        } catch (error) {
            console.error('Erreur lors du like/unlike du commentaire:', error);
            throw new Error('Erreur serveur');
        }
    }
}
