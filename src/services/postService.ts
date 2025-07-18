import { notificationRepository } from "../repositories/notification.repository";
import { postRepository } from "../repositories/post.repository";
import { UserRepository } from "../repositories/user.repository";
import { mediaRepository } from "../repositories/media.repository";
import mongoose from "mongoose";

export class PostService {
    static async createPost(postData: any, userId: string) {
        let post;
        let parentPostValue;
        try {
            const { content = '', parentPost, media = [], tags = [] } = postData;
            parentPostValue = parentPost;

            // Validation minimale du contenu
            if (!content && media.length === 0) {
                throw new Error('Le post doit contenir du texte ou au moins un média');
            }

            // Enregistrement des médias et récupération de leurs ObjectId
            const savedMediaIds: mongoose.Types.ObjectId[] = [];
            for (const m of media) {
                const savedMedia = await mediaRepository.create({
                    filename: m.filename,
                    base64: m.base64,
                    contentType: m.contentType,
                    alt: m.alt
                });
                savedMediaIds.push(savedMedia._id);
            }

            // Création du post avec références aux médias
            try {
                post = await postRepository.create({
                    content,
                    author: userId,
                    parentPost: parentPostValue || null,
                    isComment: !!parentPostValue,
                    media: savedMediaIds,
                    commentsCount: 0,
                    tags: Array.isArray(tags) ? tags : []
                });

                // Populer l'auteur
                await post.populate('author', 'username name profilePicture');
                // Populer les médias et injecter base64, contentType, alt
                await post.populate({
                    path: 'media',
                    select: 'base64 contentType alt'
                });

                // Convertir en objet simple et ajouter URL pour front
                const postObj: any = post.toObject();
                postObj.media = postObj.media.map((m: any) => ({
                    _id: m._id,
                    base64: m.base64,
                    contentType: m.contentType,
                    alt: m.alt,
                    url: `/api/media/${m._id}`
                }));

                return postObj;
            } catch (saveError) {
                console.error('Erreur lors de la sauvegarde du post:', saveError);
                throw new Error('Erreur lors de la sauvegarde du post: ' +
                    (saveError instanceof Error ? saveError.message : String(saveError)));
            }
        } catch (error) {
            console.error('Erreur lors de la préparation du post:', error);
            throw new Error('Erreur lors de la préparation du post: ' +
                (error instanceof Error ? error.message : String(error)));
        } finally {
            // Si c'est un commentaire, incrémenter le compteur du post parent
            if (parentPostValue && post) {
                await postRepository.update(parentPostValue, { $inc: { commentsCount: 1 } });
            }
        }

        // Gestion des mentions (@username) et création de notifications
        try {
            if (postData.content?.trim()) {
                const mentions = postData.content.match(/@([\w.-]+)/g);

                if (mentions?.length) {
                    const usernames = mentions.map((mention: string) => mention.substring(1));
                    const mentionedUsers = await UserRepository.findMentionnedUsers(usernames, userId);

                    if (mentionedUsers.length) {
                        const notificationPromises = mentionedUsers.map(async user => {
                            const notification = await notificationRepository.create({
                                recipient: user._id,
                                sender: userId,
                                type: 'mention',
                                post: post._id,
                                read: false
                            });
                            return notification.save();
                        });
                        await Promise.all(notificationPromises);
                    }
                }
            }
        } catch (mentionError) {
            console.error('Erreur lors du traitement des mentions:', mentionError);
        }

        return post;
    }

    static async deletePost(postId: string, userId: string) {
        const post = await postRepository.findById(postId);
        if (!post) {
            throw new Error('Post non trouvé');
        }
        if (post.author.toString() !== userId) {
            throw new Error('Non autorisé à supprimer ce post');
        }
        if (post.isComment && post.parentPost) {
            await postRepository.update(post.parentPost.toString(), { $inc: { commentsCount: -1 } });
        }
        await postRepository.delete(postId);
    }
}
