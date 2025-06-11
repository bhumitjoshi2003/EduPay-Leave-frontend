export interface Event {
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
    createdBy?: string;
    createdAt?: string;
    updatedAt?: string;
    imageUrl?: string;
}