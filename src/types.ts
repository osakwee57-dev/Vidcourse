export interface User {
  id?: string;
  username: string;
  user_code: string;
  password_hash: string;
  is_premium: boolean;
  premium_until?: string;
  created_at?: string;
}

export interface Video {
  id?: string | number;
  video_name: string;
  youtube_id: string;
  uploaded_at: string;
  category?: string;
  duration?: string;
  is_premium_only?: boolean;
}

export interface LectureNote {
  id: string;
  video_id: string;
  user_code: string;
  note_text: string;
  timestamp?: string; // e.g. "02:45"
  created_at: string;
}

export interface WatchHistory {
  video_id: string;
  user_code: string;
  watched_at: string;
  completed: boolean;
}
