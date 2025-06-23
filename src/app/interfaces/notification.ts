export interface Notification {
    id?: number;
    title: string;
    message: string;
    type: string;
    audience?: string;
}