export interface UserNotification {
    id?: number;
    userId: string;
    title: string;
    message: string;
    type: string;
    isRead: boolean;
    createdAt: string;
}