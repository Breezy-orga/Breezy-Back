import { notificationRepository } from "../repositories/notification.repository";

export class NotificationService {
    static async getNotificationById(notificationId: string) {
        try {
            const notification = await notificationRepository.findById(notificationId);
            if (!notification) {
                throw new Error('Notification not found');
            }
            return notification;
        } catch (error) {
            console.error('Error fetching notification by ID:', error);
            throw error;
        }
    }
}