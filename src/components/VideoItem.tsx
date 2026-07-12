import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  Play, CheckCircle2, Lock, MoreVertical, Trash2, 
  Check, Share2, Sparkles, FolderOpen, Clock, Plus, Download
} from "lucide-react";
import { Video } from "../types";

interface VideoItemProps {
  video: Video;
  onPlay: (video: Video) => void;
  onDelete: (youtubeId: string) => void;
  onToggleComplete: (youtubeId: string) => void;
  onAddToPlaylist?: (youtubeId: string) => void;
  onDownload?: (youtubeId: string) => void;
  isCompleted: boolean;
  isPremiumUser: boolean;
  activeVideoId?: string | number;
}

export default function VideoItem({
  video,
  onPlay,
  onDelete,
  onToggleComplete,
  onAddToPlaylist,
  onDownload,
  isCompleted,
  isPremiumUser,
  activeVideoId
}: VideoItemProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isLocked = !!video.is_premium_only && !isPremiumUser;
  const isActive = activeVideoId === video.id || activeVideoId === video.youtube_id;

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleShare = (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowDropdown(false);
    navigator.clipboard.writeText(`https://www.youtube.com/watch?v=${video.youtube_id}`);
    alert("Copied YouTube lecture link to clipboard!");
  };

  // Category visual styles helper
  const getCategoryColor = (category?: string) => {
    const cat = category?.toLowerCase() || "";
    if (cat.includes("react") || cat.includes("next")) return "bg-sky-50 text-sky-700 border-sky-100";
    if (cat.includes("typescript")) return "bg-blue-50 text-blue-700 border-blue-100";
    if (cat.includes("css") || cat.includes("design")) return "bg-pink-50 text-pink-700 border-pink-100";
    if (cat.includes("devops") || cat.includes("cloud")) return "bg-violet-50 text-violet-700 border-violet-100";
    return "bg-slate-50 text-slate-600 border-slate-150";
  };

  return (
    <motion.div
      layout
      className={`group flex items-center gap-4 p-4 sm:p-5 transition-all duration-200 rounded-2xl border relative cursor-pointer ${
        isActive 
          ? "bg-blue-700 border-white shadow-lg shadow-blue-600/30 ring-2 ring-blue-300/50" 
          : "bg-blue-600 border-blue-500/30 text-white hover:bg-blue-500 shadow-md"
      }`}
    >
      {/* Enhanced & Larger Video Thumbnail */}
      <div 
        onClick={() => !isLocked && onPlay(video)}
        className={`w-36 sm:w-48 aspect-video bg-blue-900/50 rounded-xl overflow-hidden shrink-0 relative shadow-inner border border-blue-400/30 cursor-pointer ${
          isLocked ? "opacity-65" : ""
        }`}
      >
        <img 
          src={`https://img.youtube.com/vi/${video.youtube_id}/mqdefault.jpg`} 
          alt={video.video_name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
        {video.duration && (
          <div className="absolute bottom-1.5 right-1.5 bg-slate-900/70 px-1.5 py-0.5 rounded text-[10px] font-mono text-white leading-none">
            {video.duration}
          </div>
        )}
        {isLocked && (
          <div className="absolute inset-0 bg-slate-950/40 flex items-center justify-center text-white">
            <Lock className="w-5 h-5" />
          </div>
        )}
      </div>

      {/* Title & Info */}
      <div 
        onClick={() => !isLocked && onPlay(video)}
        className="flex-1 min-w-0 pr-2 space-y-1.5 cursor-pointer text-left"
      >
        <div className="flex items-center gap-1.5 flex-wrap">
          <h3 className="text-base sm:text-lg font-bold tracking-wide line-clamp-2 leading-snug text-white">
            {video.video_name}
          </h3>
          {video.is_premium_only && (
            <span className="text-[9px] bg-amber-400/20 text-amber-300 font-bold uppercase tracking-wider px-1.5 py-0.5 rounded border border-amber-400/30 flex items-center gap-0.5 shrink-0">
              <Sparkles className="w-2.5 h-2.5 fill-amber-300" />
              <span>Premium</span>
            </span>
          )}
        </div>

        <div className="flex items-center space-x-3 text-xs text-blue-200 font-medium font-mono">
          <span>{video.duration || "15:00"}</span>
          <span className="bg-blue-500/50 px-2 py-0.5 rounded-md uppercase text-[10px] tracking-wider font-semibold">
            {video.category || "General"}
          </span>
          {isCompleted && (
            <span className="bg-emerald-500/50 text-emerald-100 px-2 py-0.5 rounded-md uppercase text-[10px] tracking-wider font-bold">
              Complete
            </span>
          )}
        </div>
      </div>

      {/* Action / Context Button & Dropdown */}
      <div className="relative shrink-0" ref={dropdownRef}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setShowDropdown(!showDropdown);
          }}
          className="text-blue-200 hover:text-white px-2 cursor-pointer text-xl font-bold transition"
          aria-label="Actions"
        >
          &#8942;
        </button>

        <AnimatePresence>
          {showDropdown && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: -5 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: -5 }}
              className="absolute right-0 mt-1.5 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 overflow-hidden py-1 text-[11px] text-slate-700 font-semibold"
            >
              {/* Complete Toggle */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleComplete(video.youtube_id);
                  setShowDropdown(false);
                }}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition flex items-center space-x-2 cursor-pointer"
              >
                <CheckCircle2 className={`w-3.5 h-3.5 ${isCompleted ? "text-emerald-500" : "text-slate-400"}`} />
                <span>{isCompleted ? "Mark Unwatched" : "Mark Completed"}</span>
              </button>

              {/* Add to Playlist */}
              {onAddToPlaylist && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddToPlaylist(video.youtube_id);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-slate-50 transition flex items-center space-x-2 cursor-pointer border-t border-slate-100"
                >
                  <Plus className="w-3.5 h-3.5 text-blue-600" />
                  <span>Add to Playlist</span>
                </button>
              )}

              {/* Download Video */}
              {onDownload && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload(video.youtube_id);
                    setShowDropdown(false);
                  }}
                  className="w-full text-left px-3 py-2 hover:bg-blue-50 text-blue-600 font-bold transition flex items-center space-x-2 cursor-pointer border-t border-slate-100"
                >
                  <Download className="w-3.5 h-3.5 text-blue-600 animate-bounce" style={{ animationDuration: '2s' }} />
                  <span>Download Video</span>
                </button>
              )}

              {/* Share link */}
              <button
                onClick={handleShare}
                className="w-full text-left px-3 py-2 hover:bg-slate-50 transition flex items-center space-x-2 cursor-pointer border-t border-slate-100"
              >
                <Share2 className="w-3.5 h-3.5 text-slate-400" />
                <span>Copy Share URL</span>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
