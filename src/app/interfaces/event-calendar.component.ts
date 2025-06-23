export interface CalendarEvent {
    id?: number;
    title: string;
    description: string;
    startDate: string;
    endDate?: string;
    startTime?: string;
    endTime?: string;
    location?: string;
    category: string;
    targetAudience: string[];
    videoLinks?: string[];
    imageUrl?: string | null;
    createdAt?: string;
    updatedAt?: string;
}