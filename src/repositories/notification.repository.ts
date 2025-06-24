import Notification from "../models/Notification";

export const notificationRepository = {
    async findById(notificationId: string) {
        if (!notificationId) {
        throw new Error('Notification ID is required');
        }
        const notification = await Notification.findById(notificationId);
        if (!notification) {
        throw new Error('Notification not found');
        }
        return notification;
    },
    
    async create(notificationData: any) {
        const notification = new Notification(notificationData);
        await notification.save();
        return notification;
    },
    
    async update(notificationId: string, notificationData: any) {
        if (!notificationId) {
        throw new Error('Notification ID is required');
        }
        const notification = await Notification.findByIdAndUpdate(notificationId, notificationData, { new: true });
        if (!notification) {
        throw new Error('Notification not found');
        }
        return notification;
    },
    
    async delete(notificationId: string) {
        if (!notificationId) {
        throw new Error('Notification ID is required');
        }
        const notification = await Notification.findByIdAndDelete(notificationId);
        if (!notification) {
        throw new Error('Notification not found');
        }
        return notification;
    }
}
