import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  GraduationCap, Plus, Search, Sparkles, Filter, 
  CheckCircle2, ListVideo, Compass, BookOpen, Heart, 
  WifiOff, Database, ArrowRight, Play, Info, Check,
  ChevronDown, ChevronUp
} from "lucide-react";

import { dbService, DEFAULT_VIDEOS } from "./lib/supabase";
import { User, Video, WatchHistory } from "./types";

import AuthModal from "./components/AuthModal";
import AddVideoModal from "./components/AddVideoModal";
import ProfileDrawer from "./components/ProfileDrawer";
import VideoItem from "./components/VideoItem";
import NotesSection from "./components/NotesSection";

export default function App() {
  // Authentication states
  const [user, setUser] = useState<User | null>(null);
  
  // App core data states
  const [videos, setVideos] = useState<Video[]>([]);
  const [activeVideo, setActiveVideo] = useState<Video | null>(null);
  const [watchHistory, setWatchHistory] = useState<WatchHistory[]>([]);
  
  // UI filter / search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [completeFilter, setCompleteFilter] = useState("All"); // All, Completed, Uncompleted
  const [lectureTypeFilter, setLectureTypeFilter] = useState<"All" | "Normal" | "Playlist">("All"); // All, Normal, Playlist

  // Modal / Drawer toggles
  const [isAddVideoOpen, setIsAddVideoOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  
  // Loading & State Flags
  const [isLoadingVideos, setIsLoadingVideos] = useState(false);
  const [isSupabaseFallback, setIsSupabaseFallback] = useState(false);
  const [notesCount, setNotesCount] = useState(0);
  const [notification, setNotification] = useState<{
    type: "success" | "error" | "info" | "confirm";
    title?: string;
    text: string;
    confirmText?: string;
    onConfirm?: () => void;
    onCancel?: () => void;
  } | null>(null);

  // Discussion comments states
  const [comments, setComments] = useState<{ id?: string; video_id: string; username: string; comment_text: string; created_at: string }[]>([]);
  const [commentText, setCommentText] = useState("");
  const [showAllComments, setShowAllComments] = useState(false);

  // Load classroom comments when activeVideo changes
  useEffect(() => {
    setShowAllComments(false);
    if (!activeVideo) {
      setComments([]);
      return;
    }
    const loadComments = async () => {
      const videoId = String(activeVideo.youtube_id);
      const { comments: fetchedComments } = await dbService.fetchComments(videoId);
      setComments(fetchedComments);
    };
    loadComments();
  }, [activeVideo]);

  const handlePostComment = async () => {
    if (!user) {
      alert("Please log in to your account first!");
      return;
    }
    const text = commentText.trim();
    if (!text) return;

    if (!activeVideo) return;

    const videoId = String(activeVideo.youtube_id);
    const { comment, error } = await dbService.addComment(videoId, user.username, text);
    
    if (error) {
      alert("Could not post comment: " + error);
      return;
    }

    if (comment) {
      setComments(prev => [comment, ...prev]);
      setCommentText("");
    }
  };

  // 1. Initial Authentication Check
  useEffect(() => {
    const session = localStorage.getItem("vid_course_user");
    if (session) {
      try {
        const parsedUser = JSON.parse(session) as User;
        setUser(parsedUser);
      } catch (e) {
        localStorage.removeItem("vid_course_user");
      }
    }
  }, []);

  // 2. Fetch Videos & Watch History when user logs in
  useEffect(() => {
    if (!user) return;

    const loadAppData = async () => {
      setIsLoadingVideos(true);
      const { videos: fetchedVideos, isFallback } = await dbService.fetchVideos();
      setVideos(fetchedVideos);
      setIsSupabaseFallback(isFallback);

      // Set first video active as default if nothing selected yet
      if (fetchedVideos.length > 0) {
        setActiveVideo(fetchedVideos[0]);
      }
      setIsLoadingVideos(false);
    };

    // Load watch history
    const historyKey = `vid_course_history_${user.user_code}`;
    const localHistory = JSON.parse(localStorage.getItem(historyKey) || "[]");
    setWatchHistory(localHistory);

    // Load notes count
    updateNotesCount();

    loadAppData();
  }, [user]);

  // Helper to re-evaluate total count of takeaway notes for dashboard stats
  const updateNotesCount = () => {
    if (!user) return;
    const allNotes = JSON.parse(localStorage.getItem("vid_course_notes") || "[]");
    const count = allNotes.filter((n: any) => n.user_code === user.user_code).length;
    setNotesCount(count);
  };

  // 3. User Session Hooks
  const handleAuthSuccess = (authenticatedUser: User) => {
    setUser(authenticatedUser);
  };

  const handleLogout = () => {
    localStorage.removeItem("vid_course_user");
    setUser(null);
    setActiveVideo(null);
    setVideos([]);
    setIsProfileOpen(false);
  };

  const handleUpdateUser = (updatedUser: User) => {
    setUser(updatedUser);
  };

  // 4. Video Actions (Add, Delete, Toggle Complete)
  const handleVideoAdded = (newVideo: Video) => {
    setVideos((prev) => [newVideo, ...prev]);
    setActiveVideo(newVideo); // Autoplay recently published video
    
    // Smooth scroll back to top of page
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleVideoDeleted = (youtubeId: string) => {
    dbService.deleteVideo(youtubeId).then(() => {
      setVideos((prev) => {
        const updated = prev.filter((v) => v.youtube_id !== youtubeId);
        
        // If the currently playing video is the one being deleted, change the active video
        if (activeVideo && activeVideo.youtube_id === youtubeId) {
          setActiveVideo(updated.length > 0 ? updated[0] : null);
        }
        
        return updated;
      });
    });
  };

  const handleToggleComplete = (youtubeId: string) => {
    if (!user) return;

    const historyKey = `vid_course_history_${user.user_code}`;
    const localHistory: WatchHistory[] = JSON.parse(localStorage.getItem(historyKey) || "[]");
    
    const existingIndex = localHistory.findIndex((h) => h.video_id === youtubeId);
    let updatedHistory = [...localHistory];

    if (existingIndex !== -1) {
      // Toggle completion status
      updatedHistory[existingIndex].completed = !updatedHistory[existingIndex].completed;
      updatedHistory[existingIndex].watched_at = new Date().toISOString();
    } else {
      // Create new watch log
      updatedHistory.push({
        video_id: youtubeId,
        user_code: user.user_code,
        watched_at: new Date().toISOString(),
        completed: true
      });
    }

    localStorage.setItem(historyKey, JSON.stringify(updatedHistory));
    setWatchHistory(updatedHistory);
  };

  const handleAddToPlaylist = async (youtubeId: string) => {
    if (!user) return;
    const res = await dbService.addToPlaylist(user.user_code, youtubeId);
    setNotification({
      type: "success",
      title: "Playlist Updated",
      text: res.message
    });
  };

  const handleDownloadCheck = (youtubeId: string) => {
    if (!user) return;
    
    // Gate conditions check
    if (!user.is_premium) {
      setNotification({
        type: "confirm",
        title: "💎 Premium Upgrade Required",
        text: "Offline lecture storage and resource downloads are limited to Premium Members. Would you like to upgrade your account now to unlock download privileges instantly?",
        confirmText: "Upgrade Account",
        onConfirm: () => {
          setNotification(null);
          dbService.toggleUserPremium(user.user_code, true).then(() => {
            const updatedUser = { ...user, is_premium: true };
            localStorage.setItem("vid_course_user", JSON.stringify(updatedUser));
            setUser(updatedUser);
            
            setNotification({
              type: "success",
              title: "💎 Account Upgraded!",
              text: "Awesome! Your account has been upgraded to Premium status. Download requirements are unlocked!"
            });
            
            setTimeout(() => {
              runDownloadRequirements(youtubeId);
            }, 1000);
          });
        },
        onCancel: () => {
          setNotification(null);
        }
      });
      return;
    }

    runDownloadRequirements(youtubeId);
  };

  const runDownloadRequirements = (youtubeId: string) => {
    const activeUserSession = user;
    if (!activeUserSession) {
      alert("Please log in to your account first!");
      return;
    }

    const now = new Date();
    const premiumExpiry = activeUserSession.premium_until ? new Date(activeUserSession.premium_until) : null;

    if (!activeUserSession.is_premium || (premiumExpiry && now > premiumExpiry)) {
      alert("📥 Premium Feature Only!\n\nThis video download is locked. Please pay the monthly subscription fee to unlock direct device saving.");
      return;
    }

    // SUCCESS: Open a functional external video downloader page with the specific video loaded
    alert("🚀 Subscription verified! Opening the video download terminal...");
    
    // This dynamically routes them to an online downloader engine with the exact video preloaded
    window.open(`https://www.youtubepp.com/watch?v=${youtubeId}`, '_blank');
  };

  // Memoized categories compiled directly from active curriculum playlist
  const categoriesList = useMemo(() => {
    const base = ["All"];
    const extracted = videos.map((v) => v.category || "General");
    const unique = Array.from(new Set(extracted));
    return [...base, ...unique];
  }, [videos]);

  // Memoized lists following search metrics
  const filteredVideos = useMemo(() => {
    return videos.filter((video) => {
      // Search term filtering
      const matchesSearch = video.video_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            (video.category && video.category.toLowerCase().includes(searchQuery.toLowerCase()));

      // Category tag filtering
      const matchesCategory = selectedCategory === "All" || video.category === selectedCategory;

      // Completion stats filtering
      const historyLog = watchHistory.find((h) => h.video_id === video.youtube_id);
      const isCompleted = historyLog ? historyLog.completed : false;
      const matchesCompletion = completeFilter === "All" || 
                                (completeFilter === "Completed" && isCompleted) ||
                                (completeFilter === "Incomplete" && !isCompleted);

      // Lecture Type filtering (playlist vs normal)
      const isPlaylist = video.youtube_id.startsWith("playlist:");
      const matchesType = lectureTypeFilter === "All" ||
                          (lectureTypeFilter === "Playlist" && isPlaylist) ||
                          (lectureTypeFilter === "Normal" && !isPlaylist);

      return matchesSearch && matchesCategory && matchesCompletion && matchesType;
    });
  }, [videos, searchQuery, selectedCategory, completeFilter, lectureTypeFilter, watchHistory]);

  const activeVideoCompleted = useMemo(() => {
    if (!activeVideo) return false;
    const log = watchHistory.find((h) => h.video_id === activeVideo.youtube_id);
    return log ? log.completed : false;
  }, [activeVideo, watchHistory]);

  // Detect premium lock on active video
  const activeVideoIsLocked = useMemo(() => {
    if (!activeVideo) return false;
    const userIsPremium = user?.is_premium || false;
    return !!activeVideo.is_premium_only && !userIsPremium;
  }, [activeVideo, user]);

  // Compile dynamic curriculum course completion progress
  const progressPercent = useMemo(() => {
    if (videos.length === 0) return 0;
    const completedCount = videos.filter((v) => 
      watchHistory.some((h) => h.video_id === v.youtube_id && h.completed)
    ).length;
    return Math.round((completedCount / videos.length) * 100);
  }, [videos, watchHistory]);

  return (
    <div className="bg-[#F1F5F9] min-h-screen font-sans flex flex-col antialiased text-slate-850 selection:bg-blue-100 selection:text-blue-950">
      
      {/* 1. Auth Overlay (Blocking modal if user is not verified yet) */}
      {!user && <AuthModal onAuthSuccess={handleAuthSuccess} />}

      {/* 2. Primary Navigation Bar */}
      {user && (
        <nav className="h-14 bg-white border-b border-slate-200 sticky top-0 z-40 px-6 flex justify-between items-center shadow-xs">
          <div 
            onClick={() => {
              setSearchQuery("");
              setSelectedCategory("All");
              setCompleteFilter("All");
              if (videos.length > 0) setActiveVideo(videos[0]);
            }}
            className="flex items-center gap-2 cursor-pointer select-none"
          >
            <img 
              id="navLogoImage"
              src="/logo.png" 
              alt="Vidcourse Logo" 
              referrerPolicy="no-referrer"
              className="w-8 h-8 rounded-lg object-cover shadow-sm border border-slate-100"
            />
            <span className="text-lg font-black text-slate-900 tracking-tight">vid.course</span>
          </div>

          {/* Animated live system session status */}
          <div className="hidden lg:flex items-center gap-1.5 bg-slate-50 px-3 py-1 rounded-full border border-slate-200">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider font-mono">Live Session: UI Design Systems</span>
          </div>

          <div className="flex items-center gap-6">
            {/* Dynamic Course progress indicator */}
            <div className="hidden md:flex flex-col items-end">
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Progress {progressPercent}%</span>
              <div className="w-32 h-1.5 bg-slate-100 rounded-full mt-1 overflow-hidden">
                <div 
                  className="h-full bg-blue-600 rounded-full transition-all duration-300" 
                  style={{ width: `${progressPercent}%` }}
                ></div>
              </div>
            </div>

            <div className="hidden sm:block h-8 w-[1px] bg-slate-200"></div>

            {/* Quick Publish Video Button Removed */}

            {/* User Profile avatar block */}
            <div className="flex items-center gap-2.5">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-bold text-slate-900 leading-none">{user.username}</p>
                <p className="text-[9px] font-semibold text-blue-600 uppercase mt-0.5 tracking-wider font-mono">
                  {user.is_premium ? "Premium Learner" : "Free Learner"}
                </p>
              </div>

              <div 
                onClick={() => {
                  updateNotesCount();
                  setIsProfileOpen(true);
                }}
                className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700 shadow-sm flex items-center justify-center text-white font-black text-xs cursor-pointer select-none hover:bg-slate-800 hover:scale-105 transition"
              >
                {user.username.charAt(0).toUpperCase()}
              </div>
            </div>
          </div>
        </nav>
      )}

      {/* 3. Main Workspace Area */}
      {user && (
        <main className="max-w-6xl mx-auto p-4 grid grid-cols-1 md:grid-cols-3 gap-6 items-start">          {/* LEFT/CENTER AREA: Video Player and Title details (md:col-span-2) */}
          <div className="md:col-span-2 md:sticky md:top-20 space-y-6">
            
            {/* 1. Video Theater Player Container */}
            <div 
              id="videoTheater" 
              className={`bg-black w-full aspect-video rounded-2xl shadow-lg overflow-hidden border border-gray-800 relative select-none ${!activeVideo ? 'hidden' : ''}`}
            >
              {activeVideoIsLocked ? (
                /* Lock screen for non-premium accounts requesting a premium-locked video */
                <div className="absolute inset-0 bg-slate-950 flex flex-col items-center justify-center text-center p-6 space-y-4 z-10">
                  <div className="bg-amber-100/10 p-4 rounded-full text-amber-500 border border-amber-500/20 animate-pulse">
                    <Sparkles className="w-8 h-8 fill-amber-500" />
                  </div>
                  <div className="space-y-1.5 max-w-sm">
                    <h4 className="text-white font-display font-black text-lg tracking-tight">💎 Premium Lecture Locked</h4>
                    <p className="text-xs text-slate-400 leading-relaxed">
                      This exclusive lecture requires a **Premium Account Status** to access resources, transcripts, and screen feeds.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      updateNotesCount();
                      setIsProfileOpen(true);
                    }}
                    className="bg-gradient-to-r from-amber-500 to-orange-500 text-white font-bold text-xs py-2 px-5 rounded-lg shadow-md hover:scale-102 transition cursor-pointer"
                  >
                    Unlock Premium (Toggle in Profile Drawer)
                  </button>
                </div>
              ) : (
                /* The real iframe Youtube video container */
                activeVideo && (
                  <>
                    <iframe
                      id="playerIframe"
                      className="w-full h-full"
                      src={
                        activeVideo.youtube_id.startsWith("playlist:")
                          ? `https://www.youtube.com/embed/videoseries?list=${activeVideo.youtube_id.replace("playlist:", "")}&autoplay=1&modestbranding=1&rel=0`
                          : `https://www.youtube.com/embed/${activeVideo.youtube_id}?autoplay=1&modestbranding=1&rel=0`
                      }
                      title={activeVideo.video_name}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                    />
                    <div 
                      className="absolute bottom-0 right-0 w-32 h-14 bg-transparent z-50 pointer-events-auto cursor-default" 
                      title="External links are disabled"
                      onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
                    />
                  </>
                )
              )}
            </div>

            {/* 2. Video Placeholder container */}
            <div 
              id="videoPlaceholder" 
              className={`bg-gray-800 text-gray-400 aspect-video rounded-2xl flex flex-col items-center justify-center p-6 text-center border border-gray-700 ${activeVideo ? 'hidden' : ''}`}
            >
              <svg className="w-12 h-12 mb-2 text-gray-500" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
                <path d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z"></path>
              </svg>
              <p className="text-sm font-medium">Select a lecture from the feed list to start watching</p>
            </div>

            {/* 3. Classroom Discussion panel */}
            <div 
              id="discussionPanel" 
              className={`bg-white p-6 rounded-2xl border border-gray-200 shadow-xs space-y-4 ${!activeVideo ? 'hidden' : ''}`}
            >
              <h3 className="text-base font-bold text-gray-900 tracking-tight flex items-center space-x-2">
                <span>💬</span> <span>Classroom Discussion</span>
              </h3>
              
              <div className="flex space-x-3 items-start">
                <div className="flex-1">
                  <textarea 
                    id="commentTextArea" 
                    rows={2} 
                    placeholder="Ask a question or leave a note about this lecture..." 
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 text-gray-800 resize-none"
                  />
                </div>
                <button 
                  id="postCommentBtn" 
                  onClick={handlePostComment}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs px-4 py-3 rounded-xl shadow-xs transition cursor-pointer self-end shrink-0"
                >
                  Comment
                </button>
              </div>

              <div id="commentsFeedWrapper" className="space-y-3 pt-2 max-h-64 overflow-y-auto divide-y divide-gray-50">
                {comments.length === 0 ? (
                  <p className="text-xs text-gray-400 italic">No comments posted on this thread yet.</p>
                ) : (
                  <div className="space-y-3">
                    {(showAllComments ? comments : comments.slice(0, 3)).map((comment, index) => (
                      <div key={comment.id || `${comment.created_at}_${index}`} className="pt-3 first:pt-0">
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-1">
                          <span className="font-bold text-blue-600">@{comment.username}</span>
                          <span className="font-mono text-[9px]">
                            {new Date(comment.created_at).toLocaleDateString()} {new Date(comment.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-700 leading-relaxed break-words whitespace-pre-wrap">{comment.comment_text}</p>
                      </div>
                    ))}

                    {comments.length > 3 && (
                      <div className="pt-2 flex justify-center">
                        <button
                          onClick={() => setShowAllComments(!showAllComments)}
                          className="flex items-center gap-1.5 text-[11px] text-blue-600 hover:text-blue-700 font-bold transition focus:outline-none cursor-pointer py-1.5 px-3 bg-blue-50/50 hover:bg-blue-50 rounded-lg border border-blue-100/50"
                        >
                          <span>{showAllComments ? "Show Less" : `Show More (${comments.length - 3})`}</span>
                          {showAllComments ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* 4. Active Video Details Title block & actions */}
            {activeVideo && (
              <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-3.5 shadow-2xs">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[10px] font-bold rounded uppercase border border-blue-100 font-mono">
                    {activeVideo.category || "General"}
                  </span>
                  <span className="text-slate-300">•</span>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                    Duration: {activeVideo.duration || "15:00"}
                  </span>
                  {activeVideo.is_premium_only && (
                    <>
                      <span className="text-slate-300">•</span>
                      <span className="text-[10px] bg-amber-50 text-amber-700 font-bold uppercase tracking-widest font-mono px-2 py-0.5 rounded border border-amber-100 flex items-center gap-0.5">
                        💎 Premium
                      </span>
                    </>
                  )}
                </div>

                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight leading-snug">
                  {activeVideo.video_name}
                </h2>

                <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-2xl">
                  Master industry standards and core architectural layers with this lecture sequence. We explore real-world scaling, trade-offs, and deployable production code to harden system design pipelines.
                </p>

                {/* Completion Switcher / Timestamp */}
                <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between gap-4 text-xs font-medium text-slate-400">
                  <span className="text-[10px] font-mono">Published on {new Date(activeVideo.uploaded_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => handleToggleComplete(activeVideo.youtube_id)}
                    className={`px-3 py-1.5 rounded-lg font-bold text-[10px] flex items-center space-x-1.5 transition cursor-pointer select-none border uppercase tracking-wider font-mono ${
                      activeVideoCompleted
                        ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200"
                    }`}
                  >
                    {activeVideoCompleted ? (
                      <>
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                        <span>Completed</span>
                      </>
                    ) : (
                      <>
                        <div className="w-3 h-3 rounded-full border-2 border-slate-300" />
                        <span>Mark Finished</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

          </div>

          {/* RIGHT COLUMN: Available Lectures (md:col-span-1) */}
          <div className="md:col-span-1 space-y-4">
            <h2 className="text-lg font-bold text-slate-800 px-1">Available Lectures</h2>
            
            <div id="userVideoFeed" className="space-y-4 max-h-[calc(100vh-12rem)] overflow-y-auto pr-1 custom-scrollbar">
              
              {/* Syllabus Catalog Filter Controls Inside Available Lectures */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-2xs space-y-4">
                
                {/* Syllabus Header */}
                <div className="pb-3 border-b border-slate-100 flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-800 font-sans tracking-tight">Catalog Filter</span>
                  <span className="text-[9px] bg-slate-100 text-slate-500 font-mono font-bold px-2 py-0.5 rounded shrink-0 border border-slate-200/50">
                    {filteredVideos.length} / {videos.length} Lectures
                  </span>
                </div>

                {/* Live Search text input */}
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search courses or tags..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-blue-500 text-xs text-slate-800"
                  />
                </div>

                {/* Scrollable Categories Row */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-1 text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">
                    <Filter className="w-3 h-3" />
                    <span>Category Tags</span>
                  </div>
                  <div className="flex flex-wrap gap-1 max-h-24 overflow-y-auto pr-1">
                    {categoriesList.map((cat) => (
                      <button
                        key={cat}
                        onClick={() => setSelectedCategory(cat)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer border ${
                          selectedCategory === cat
                            ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                            : "bg-slate-50 hover:bg-slate-100 text-slate-500 border-slate-200"
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Lecture Format Filter Row */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-1 text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">
                    <ListVideo className="w-3 h-3" />
                    <span>Lecture Format</span>
                  </div>
                  <div className="flex border border-slate-200 rounded-xl overflow-hidden p-1 bg-slate-50/50">
                    {[
                      { label: "All", value: "All" },
                      { label: "Normal", value: "Normal" },
                      { label: "Playlists", value: "Playlist" }
                    ].map((item) => (
                      <button
                        key={item.value}
                        onClick={() => setLectureTypeFilter(item.value as any)}
                        className={`flex-1 text-center py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          lectureTypeFilter === item.value
                            ? "bg-blue-600 text-white shadow-3xs border border-blue-600"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Watched Status Filter Row */}
                <div className="space-y-1.5">
                  <div className="flex items-center space-x-1 text-[9px] font-black text-slate-400 uppercase tracking-wider font-mono">
                    <Check className="w-3 h-3" />
                    <span>Completion Status</span>
                  </div>
                  <div className="flex border border-slate-200 rounded-xl overflow-hidden p-1 bg-slate-50/50">
                    {["All", "Completed", "Incomplete"].map((f) => (
                      <button
                        key={f}
                        onClick={() => setCompleteFilter(f)}
                        className={`flex-1 text-center py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                          completeFilter === f
                            ? "bg-white text-slate-800 shadow-3xs border border-slate-200/50"
                            : "text-slate-400 hover:text-slate-600"
                        }`}
                      >
                        {f}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Video items feed */}
              <div className="space-y-2">
                <AnimatePresence mode="popLayout">
                  {isLoadingVideos ? (
                    /* Skeleton Loaders while fetching */
                    Array.from({ length: 3 }).map((_, idx) => (
                      <div 
                        key={idx}
                        className="animate-pulse bg-white p-4 h-16 rounded-xl border border-slate-200"
                      />
                    ))
                  ) : filteredVideos.length === 0 ? (
                    /* Feed Empty State */
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="bg-white rounded-xl border border-slate-200 p-8 text-center text-slate-400"
                    >
                      <Compass className="w-6 h-6 text-slate-300 mx-auto mb-1.5" />
                      <p className="text-xs font-semibold text-slate-500">No lectures found matching criteria</p>
                      <p className="text-[10px] text-slate-400 mt-0.5">Try searching another tag!</p>
                    </motion.div>
                  ) : (
                    (() => {
                      const playlists = filteredVideos.filter(v => v.youtube_id.startsWith("playlist:"));
                      const normals = filteredVideos.filter(v => !v.youtube_id.startsWith("playlist:"));
                      
                      return (
                        <div className="space-y-6">
                          {/* Playlists Group */}
                          {playlists.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5 px-1">
                                <span>📂</span>
                                <span>Course Playlists ({playlists.length})</span>
                              </h3>
                              <div className="space-y-2">
                                {playlists.map((video) => {
                                  const log = watchHistory.find((h) => h.video_id === video.youtube_id);
                                  const isComp = log ? log.completed : false;
                                  return (
                                    <VideoItem
                                      key={video.id || video.youtube_id}
                                      video={video}
                                      onPlay={(v) => setActiveVideo(v)}
                                      onDelete={handleVideoDeleted}
                                      onToggleComplete={handleToggleComplete}
                                      onAddToPlaylist={handleAddToPlaylist}
                                      onDownload={handleDownloadCheck}
                                      isCompleted={isComp}
                                      isPremiumUser={user?.is_premium || false}
                                      activeVideoId={activeVideo?.id || activeVideo?.youtube_id}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          {/* Normal Videos Group */}
                          {normals.length > 0 && (
                            <div className="space-y-2">
                              <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono flex items-center gap-1.5 px-1">
                                <span>📹</span>
                                <span>Single Lectures ({normals.length})</span>
                              </h3>
                              <div className="space-y-2">
                                {normals.map((video) => {
                                  const log = watchHistory.find((h) => h.video_id === video.youtube_id);
                                  const isComp = log ? log.completed : false;
                                  return (
                                    <VideoItem
                                      key={video.id || video.youtube_id}
                                      video={video}
                                      onPlay={(v) => setActiveVideo(v)}
                                      onDelete={handleVideoDeleted}
                                      onToggleComplete={handleToggleComplete}
                                      onAddToPlaylist={handleAddToPlaylist}
                                      onDownload={handleDownloadCheck}
                                      isCompleted={isComp}
                                      isPremiumUser={user?.is_premium || false}
                                      activeVideoId={activeVideo?.id || activeVideo?.youtube_id}
                                    />
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })()
                  )}
                </AnimatePresence>
              </div>

              {/* Design theme Resource Bundle */}
              <div className="p-4 bg-slate-900 rounded-2xl shadow-sm border border-slate-800">
                <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest font-mono">Resource Bundle</p>
                <p className="text-xs font-bold text-white mt-1">Architecture PDF Guide & Notes</p>
                <button 
                  onClick={() => setNotification({
                    type: "success",
                    title: "📥 Download Initiated",
                    text: "Downloading Curriculum Resource Pack: contains 12 architecture PDFs, system-diagrams.sketch, and reference code. (Premium-Only asset successfully authorized)"
                  })}
                  className="w-full mt-3 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 py-2 rounded-lg text-[11px] font-bold text-white uppercase tracking-wider font-mono transition cursor-pointer"
                >
                  Download Files
                </button>
              </div>

              {/* Database Link indicator */}
              <div className="bg-white p-3 rounded-xl border border-slate-200 text-xs text-slate-500 flex items-center justify-between">
                <span className="font-mono text-[10px] font-bold text-slate-400 uppercase">Database Link</span>
                {isSupabaseFallback ? (
                  <div 
                    title="Database is running using a local storage client."
                    className="flex items-center space-x-1 text-amber-700 text-[10px] font-semibold font-mono"
                  >
                    <Database className="w-3 h-3" />
                    <span>Local DB Engine</span>
                  </div>
                ) : (
                  <div 
                    title="Connected to Supabase Cloud Instance!"
                    className="flex items-center space-x-1 text-emerald-700 text-[10px] font-semibold font-mono"
                  >
                    <Check className="w-3 h-3" />
                    <span>Supabase Live</span>
                  </div>
                )}
              </div>

            </div>
          </div>

        </main>
      )}

      {/* 4. Sub-Modal: Add Video / Publish Lecture Modal */}
      <AnimatePresence>
        {isAddVideoOpen && (
          <AddVideoModal 
            onClose={() => setIsAddVideoOpen(false)} 
            onVideoAdded={handleVideoAdded} 
          />
        )}
      </AnimatePresence>

      {/* 5. Sub-Drawer: Right-side Profile drawer panel */}
      {user && (
        <ProfileDrawer
          isOpen={isProfileOpen}
          onClose={() => setIsProfileOpen(false)}
          user={user}
          onLogout={handleLogout}
          onUpdateUser={handleUpdateUser}
          history={watchHistory}
          notesCount={notesCount}
          videos={videos}
          onPlayVideo={setActiveVideo}
        />
      )}

      {/* 6. Custom Elegant Notification Toast/Modal */}
      <AnimatePresence>
        {notification && (
          <div className="fixed inset-0 bg-slate-950/65 backdrop-blur-xs z-[100] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 p-6 space-y-4"
            >
              <div className="flex items-start gap-3">
                <div className={`p-2 rounded-xl text-white shrink-0 ${
                  notification.type === "success" 
                    ? "bg-emerald-500" 
                    : notification.type === "error" 
                      ? "bg-rose-500" 
                      : notification.type === "confirm"
                        ? "bg-amber-500"
                        : "bg-blue-500"
                }`}>
                  <Sparkles className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-bold text-slate-900 text-sm">{notification.title || "Message"}</h3>
                  <p className="text-xs text-slate-500 leading-relaxed whitespace-pre-wrap">{notification.text}</p>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-50">
                {notification.type === "confirm" ? (
                  <>
                    <button
                      onClick={notification.onCancel || (() => setNotification(null))}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl text-xs cursor-pointer transition"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={notification.onConfirm}
                      className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl text-xs cursor-pointer transition shadow-sm shadow-blue-500/10"
                    >
                      {notification.confirmText || "Confirm"}
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setNotification(null)}
                    className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer transition"
                  >
                    Dismiss
                  </button>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
