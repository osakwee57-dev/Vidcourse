import { createClient } from "@supabase/supabase-js";
import { User, Video } from "../types";

const SUPABASE_URL = "https://juyoyxjdudyvnpxetexe.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp1eW95eGpkdWR5dm5weGV0ZXhlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2OTc5MjYsImV4cCI6MjA5OTI3MzkyNn0.5pRu3Da_iHFmcDIUt0ZcKjYE2XOFB58GzskE7sv79Zc";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Default Seed Videos in case the database is empty or tables do not exist yet.
export const DEFAULT_VIDEOS: Video[] = [
  {
    id: "v1",
    video_name: "React 19 & Next.js 15: Deep Dive Tutorial for Developers",
    youtube_id: "81P_K8v_XbM",
    uploaded_at: "2026-06-20T10:00:00Z",
    category: "React & Next.js",
    duration: "42:15",
    is_premium_only: false
  },
  {
    id: "v2",
    video_name: "Tailwind CSS v4.0: Mastering the Modern Engine & Styling",
    youtube_id: "m8-8I7E9iW4",
    uploaded_at: "2026-05-15T14:30:00Z",
    category: "CSS & Design",
    duration: "28:50",
    is_premium_only: false
  },
  {
    id: "v3",
    video_name: "TypeScript 5.x Absolute Beginner to Advanced Complete Guide",
    youtube_id: "H91uMUAIP2Y",
    uploaded_at: "2026-04-10T09:15:00Z",
    category: "TypeScript",
    duration: "1:15:20",
    is_premium_only: false
  },
  {
    id: "v4",
    video_name: "💎 Premium Masterclass: Web Application Scaling & Production Deployments",
    youtube_id: "zjs260t_5As",
    uploaded_at: "2026-07-01T12:00:00Z",
    category: "DevOps & Cloud",
    duration: "54:10",
    is_premium_only: true
  }
];

// Helper to generate a random user ID code (e.g., A1234, C8901)
export function generateUserCode(): string {
  const prefixes = ['A', 'B', 'C', 'D', 'E'];
  const randomPrefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  const randomDigits = Math.floor(1000 + Math.random() * 9000);
  return `${randomPrefix}${randomDigits}`;
}

/**
 * Service class that handles users and videos.
 * It queries Supabase and falls back to LocalStorage if there are errors (e.g. table not created yet).
 */
export const dbService = {
  // ---- USER AUTH ACTIONS ----
  
  async loginUser(userCode: string, passwordHash: string): Promise<{ user: User | null; error: string | null; isFallback: boolean }> {
    const code = userCode.trim().toUpperCase();
    const password = passwordHash.trim();
    
    try {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('user_code', code)
        .eq('password_hash', password)
        .maybeSingle();

      if (error) {
        throw error;
      }

      if (data) {
        return { user: data as User, error: null, isFallback: false };
      }
      
      // Fallback to localStorage check if no DB record matches
      const localUsers: User[] = JSON.parse(localStorage.getItem('vid_course_fallback_users') || '[]');
      const localMatch = localUsers.find(u => u.user_code === code && u.password_hash === password);
      
      if (localMatch) {
        return { user: localMatch, error: null, isFallback: true };
      }

      return { user: null, error: "Invalid System Verification Code or Wrong Password.", isFallback: false };
    } catch (e: any) {
      console.warn("Supabase auth failed, trying local storage fallback", e);
      // Fallback local query
      const localUsers: User[] = JSON.parse(localStorage.getItem('vid_course_fallback_users') || '[]');
      const localMatch = localUsers.find(u => u.user_code === code && u.password_hash === password);
      if (localMatch) {
        return { user: localMatch, error: null, isFallback: true };
      }
      return { user: null, error: `Auth Error (using local storage fallback if registered locally): ${e.message || e}`, isFallback: true };
    }
  },

  async registerUser(username: string, passwordHash: string): Promise<{ userCode: string | null; error: string | null; isFallback: boolean }> {
    const trimmedUsername = username.trim();
    const password = passwordHash.trim();
    const generatedCode = generateUserCode();

    try {
      const newUser: User = {
        username: trimmedUsername,
        user_code: generatedCode,
        password_hash: password,
        is_premium: false
      };

      const { error } = await supabase
        .from('users')
        .insert([newUser]);

      if (error) {
        throw error;
      }

      return { userCode: generatedCode, error: null, isFallback: false };
    } catch (e: any) {
      console.warn("Supabase insert failed, registering user locally", e);
      
      const newUser: User = {
        username: trimmedUsername,
        user_code: generatedCode,
        password_hash: password,
        is_premium: false,
        created_at: new Date().toISOString()
      };

      // Register in local storage
      const localUsers: User[] = JSON.parse(localStorage.getItem('vid_course_fallback_users') || '[]');
      localUsers.push(newUser);
      localStorage.setItem('vid_course_fallback_users', JSON.stringify(localUsers));

      return { userCode: generatedCode, error: null, isFallback: true };
    }
  },

  async toggleUserPremium(userCode: string, isPremium: boolean): Promise<boolean> {
    try {
      // 1. Try updating database
      const { error } = await supabase
        .from('users')
        .update({ is_premium: isPremium })
        .eq('user_code', userCode);
      
      if (error) throw error;
      return true;
    } catch (e) {
      console.warn("Could not sync premium status to Supabase, updating local storage", e);
    }

    // Always update local storage as fallback/complement
    const localUsers: User[] = JSON.parse(localStorage.getItem('vid_course_fallback_users') || '[]');
    const userIndex = localUsers.findIndex(u => u.user_code === userCode);
    if (userIndex !== -1) {
      localUsers[userIndex].is_premium = isPremium;
      localStorage.setItem('vid_course_fallback_users', JSON.stringify(localUsers));
    }
    
    // Also update current active session if it's the current user
    const currentUser = JSON.parse(localStorage.getItem('vid_course_user') || 'null');
    if (currentUser && currentUser.user_code === userCode) {
      currentUser.is_premium = isPremium;
      localStorage.setItem('vid_course_user', JSON.stringify(currentUser));
    }
    return true;
  },

  // ---- VIDEO MANIPULATION ----

  async fetchVideos(): Promise<{ videos: Video[]; error: string | null; isFallback: boolean }> {
    try {
      const { data, error } = await supabase
        .from('videos')
        .select('*')
        .order('uploaded_at', { ascending: false });

      if (error) {
        throw error;
      }

      if (data && data.length > 0) {
        return { videos: data as Video[], error: null, isFallback: false };
      }

      // If table exists but has 0 records, try local videos
      const localVideos: Video[] = JSON.parse(localStorage.getItem('vid_course_fallback_videos') || '[]');
      const allVideos = [...localVideos, ...DEFAULT_VIDEOS];
      // De-duplicate by youtube_id
      const uniqueVideos = allVideos.filter((v, index, self) => 
        self.findIndex(t => t.youtube_id === v.youtube_id) === index
      );

      return { videos: uniqueVideos, error: null, isFallback: true };
    } catch (e: any) {
      console.warn("Supabase fetch videos failed, falling back to local storage", e);
      const localVideos: Video[] = JSON.parse(localStorage.getItem('vid_course_fallback_videos') || '[]');
      const allVideos = [...localVideos, ...DEFAULT_VIDEOS];
      const uniqueVideos = allVideos.filter((v, index, self) => 
        self.findIndex(t => t.youtube_id === v.youtube_id) === index
      );
      return { videos: uniqueVideos, error: null, isFallback: true };
    }
  },

  async addVideo(videoName: string, youtubeId: string, category: string = "General", duration: string = "10:00", isPremiumOnly: boolean = false): Promise<{ video: Video | null; error: string | null; isFallback: boolean }> {
    const cleanId = youtubeId.trim();
    const cleanName = videoName.trim();
    
    const newVideo: Video = {
      video_name: cleanName,
      youtube_id: cleanId,
      uploaded_at: new Date().toISOString(),
      category,
      duration,
      is_premium_only: isPremiumOnly
    };

    try {
      const { data, error } = await supabase
        .from('videos')
        .insert([newVideo])
        .select();

      if (error) {
        throw error;
      }

      return { video: data ? data[0] : newVideo, error: null, isFallback: false };
    } catch (e: any) {
      console.warn("Supabase add video failed, storing locally", e);
      
      const fallbackVideo: Video = {
        id: "local_" + Math.random().toString(36).substr(2, 9),
        ...newVideo
      };

      const localVideos: Video[] = JSON.parse(localStorage.getItem('vid_course_fallback_videos') || '[]');
      localVideos.unshift(fallbackVideo);
      localStorage.setItem('vid_course_fallback_videos', JSON.stringify(localVideos));

      return { video: fallbackVideo, error: null, isFallback: true };
    }
  },

  async deleteVideo(youtubeId: string): Promise<{ success: boolean; error: string | null; isFallback: boolean }> {
    try {
      const { error } = await supabase
        .from('videos')
        .delete()
        .eq('youtube_id', youtubeId);

      if (error) throw error;
      return { success: true, error: null, isFallback: false };
    } catch (e: any) {
      console.warn("Supabase delete failed, removing locally", e);
      const localVideos: Video[] = JSON.parse(localStorage.getItem('vid_course_fallback_videos') || '[]');
      const updated = localVideos.filter(v => v.youtube_id !== youtubeId);
      localStorage.setItem('vid_course_fallback_videos', JSON.stringify(updated));
      return { success: true, error: null, isFallback: true };
    }
  },

  async addToPlaylist(userCode: string, youtubeId: string): Promise<{ success: boolean; message: string }> {
    try {
      // Find the user's UUID or PK in Supabase first
      const { data: userRecord, error: userError } = await supabase
        .from('users')
        .select('id')
        .eq('user_code', userCode)
        .maybeSingle();

      if (userRecord && userRecord.id) {
        // Resolve video PK from the youtube_id
        const { data: videoRecord } = await supabase
          .from('videos')
          .select('id')
          .eq('youtube_id', youtubeId)
          .maybeSingle();

        const resolvedVideoId = videoRecord ? videoRecord.id : youtubeId;

        const { error } = await supabase
          .from('playlists')
          .insert([{ user_id: userRecord.id, video_id: resolvedVideoId }]);

        if (error) {
          if (error.code === '23505' || error.message?.includes('unique') || error.message?.includes('duplicate')) {
            return { success: false, message: "This lesson is already saved to your profile playlist!" };
          }
          throw error;
        }
        return { success: true, message: "Lecture added to your profile playlist summary successfully!" };
      }
    } catch (err: any) {
      console.warn("Supabase playlist insert failed, falling back to LocalStorage:", err);
    }

    // Fallback/LocalStorage Playlist
    const playlistKey = `vid_course_playlist_${userCode}`;
    const localPlaylist: string[] = JSON.parse(localStorage.getItem(playlistKey) || "[]");
    if (localPlaylist.includes(youtubeId)) {
      return { success: false, message: "This lesson is already saved to your profile playlist!" };
    }
    localPlaylist.push(youtubeId);
    localStorage.setItem(playlistKey, JSON.stringify(localPlaylist));
    return { success: true, message: "Lecture added to your profile playlist summary successfully! (Saved to local account)" };
  },

  async fetchPlaylist(userCode: string): Promise<string[]> {
    try {
      const { data: userRecord } = await supabase
        .from('users')
        .select('id')
        .eq('user_code', userCode)
        .maybeSingle();

      if (userRecord && userRecord.id) {
        const { data: playlistRows } = await supabase
          .from('playlists')
          .select('video_id, videos(youtube_id)')
          .eq('user_id', userRecord.id);

        if (playlistRows) {
          const youtubeIds = playlistRows.map((row: any) => {
            if (row.videos && row.videos.youtube_id) {
              return row.videos.youtube_id;
            }
            return row.video_id;
          });
          return youtubeIds.filter(Boolean);
        }
      }
    } catch (err) {
      console.warn("Supabase fetchPlaylist failed, reading from LocalStorage:", err);
    }

    const playlistKey = `vid_course_playlist_${userCode}`;
    return JSON.parse(localStorage.getItem(playlistKey) || "[]");
  },

  async removeFromPlaylist(userCode: string, youtubeId: string): Promise<boolean> {
    try {
      const { data: userRecord } = await supabase
        .from('users')
        .select('id')
        .eq('user_code', userCode)
        .maybeSingle();

      if (userRecord && userRecord.id) {
        const { data: videoRecord } = await supabase
          .from('videos')
          .select('id')
          .eq('youtube_id', youtubeId)
          .maybeSingle();

        const resolvedVideoId = videoRecord ? videoRecord.id : youtubeId;

        const { error } = await supabase
          .from('playlists')
          .delete()
          .eq('user_id', userRecord.id)
          .eq('video_id', resolvedVideoId);

        if (!error) return true;
      }
    } catch (err) {
      console.warn("Supabase removeFromPlaylist failed, modifying LocalStorage:", err);
    }

    const playlistKey = `vid_course_playlist_${userCode}`;
    let localPlaylist: string[] = JSON.parse(localStorage.getItem(playlistKey) || "[]");
    localPlaylist = localPlaylist.filter(id => id !== youtubeId);
    localStorage.setItem(playlistKey, JSON.stringify(localPlaylist));
    return true;
  }
};
