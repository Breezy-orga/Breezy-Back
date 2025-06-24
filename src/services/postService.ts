import { notificationRepository } from "../repositories/notification.repository";
import { postRepository } from "../repositories/post.repository";
import { UserRepository } from "../repositories/user.repository";

export class PostService {
    static async createPost(postData: any, userId: string) {
        let post;
        let parentPostValue;
        try {
            if (!userId) {
                throw new Error('Utilisateur non authentifié');
            }

            const { content = '', parentPost, media = [], tags = [] } = postData;
            parentPostValue = parentPost;

            // Validation minimale du contenu
            if (!content && media.length === 0) {
                throw new Error('Le post doit contenir du texte ou au moins un média');
            }
            
            // Validation des médias
            let mediaArray = [];
            if (Array.isArray(media)) {
                mediaArray = media;
            } else if (media) {
                // S'il n'est pas un tableau mais existe, on le met dans un tableau
                mediaArray = [media];
            }
            
            // Créer le post avec le contenu et éventuellement les médias et tags
            
            try {
                post = await postRepository.create({
                    content,
                    author: userId,
                    parentPost: parentPostValue || null,
                    isComment: !!parentPostValue,
                    media: mediaArray,
                    commentsCount: 0,
                    tags: Array.isArray(tags) ? tags : []
                });

                await post.populate('author', 'username profilePicture');
            } catch (saveError) {
                console.error('Erreur lors de la sauvegarde du post:', saveError);
                throw new Error('Erreur lors de la sauvegarde du post: ' + (saveError instanceof Error ? saveError.message : String(saveError)));
            }
        } catch (saveError) {
            console.error('Erreur lors de la sauvegarde du post:', saveError);
            throw new Error('Erreur lors de la sauvegarde du post: ' + (saveError instanceof Error ? saveError.message : String(saveError)));
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
            // Ne pas bloquer la création du post si la gestion des mentions échoue
            console.error('Erreur lors du traitement des mentions:', mentionError);
        }
    }
}