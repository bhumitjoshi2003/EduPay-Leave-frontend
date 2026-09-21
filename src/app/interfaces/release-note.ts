export interface ReleaseNote {
  version: string;
  title: string;
  summary: string | null;
  items: string[];
  publishedAt: string;
}
