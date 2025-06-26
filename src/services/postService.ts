import { notificationRepository } from "../repositories/notification.repository";
import { postRepository } from "../repositories/post.repository";
import { UserRepository } from "../repositories/user.repository";

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
            console.log("💥💥💥DEBUG: Création du post - media.base64:", media);
            // Créer le post avec le contenu et éventuellement les médias et tags
            try {
                post = await postRepository.create({
                    content,
                    author: userId,
                    parentPost: parentPostValue || null,
                    isComment: !!parentPostValue,
                    media: media,
                    commentsCount: 0,
                    tags: Array.isArray(tags) ? tags : []
                });

                await post.populate('author', 'username profilePicture');
            } catch (saveError) {
                console.error('Erreur lors de la sauvegarde du post:', "500 post"/*error.message*/);
                throw new Error('Erreur lors de la sauvegarde du post: ' + (saveError instanceof Error ? saveError.message : String("500 post"/*error.message*/)));
            }
        } catch (saveError) {
            console.error('Erreur lors de la sauvegarde du post:', "500 post"/*error.message*/);
            throw new Error('Erreur lors de la sauvegarde du post: ' + (saveError instanceof Error ? saveError.message : String("500 post"/*error.message*/)));
        }
        // Si c'est un commentaire, incrémenter le compteur du post parent
        if (parentPostValue) {
            await postRepository.update(parentPostValue, { $inc: { commentsCount: 1 } });
        }
        
        // Détecter les mentions (@username) et créer des notifications
        try {
            if (postData.content && postData.content.trim().length > 0) {
                // Trouver tous les @username dans le contenu (expression régulière améliorée)
                const mentions = postData.content.match(/@([\w.-]+)/g);

                console.log('Mentions détectées:', mentions);
                
                if (mentions && mentions.length > 0) {
                    // Extraire les noms d'utilisateur sans le @
                    const usernames = mentions.map((mention: string) => mention.substring(1));
                    
                    console.log('Usernames extraits:', usernames);
                    
                    // Trouver les utilisateurs correspondants
                    const mentionedUsers = await UserRepository.findMentionnedUsers(usernames, userId);

                    console.log('Utilisateurs trouvés:', mentionedUsers.map(u => u.username));
                    
                    if (mentionedUsers.length > 0) {
                        // Créer une notification pour chaque utilisateur mentionné
                        const notificationPromises = mentionedUsers.map(async user => {
                            const notification = await notificationRepository.create({
                                recipient: user._id,
                                sender: userId || '',
                                type: 'mention',
                                post: post._id,
                                read: false
                            });

                            return notification.save();
                        });
                        
                        await Promise.all(notificationPromises);
                        console.log(`${notificationPromises.length} notifications créées pour les mentions`);
                    } else {
                        console.log('Aucun utilisateur trouvé pour les mentions:', usernames);
                    }
                } else {
                    console.log('Aucune mention détectée dans:', postData.content);
                }
            } else {
                console.log('Post sans contenu textuel, pas de vérification de mentions');
            }
        } catch (mentionError) {
            // Ne pas bloquer la st si la gestion des mentions échoue
            console.error('Erreur lors du traitement des mentions:', mentionError);
        }
        return post;
    }

    static async deletePost(postId: string, userId: string) {
        // Trouver le post
        const post = await postRepository.findById(postId);
        if (!post) {
            throw new Error('Post non trouvé');
        }
        // Vérifier l'auteur
        if (post.author.toString() !== userId) {
            throw new Error('Non autorisé à supprimer ce post');
        }
        // Si c'est un commentaire, décrémenter le compteur du post parent
        if (post.isComment && post.parentPost) {
            await postRepository.update(post.parentPost.toString(), { $inc: { commentsCount: -1 } });
        }
        // Supprimer le post
        await postRepository.delete(postId );
    }
}