import React, { useState } from "react";
import { motion } from "motion/react";
import { X, Video as VideoIcon, Sparkles, Plus, AlertCircle, FileVideo, Clock, Tag } from "lucide-react";
import { dbService } from "../lib/supabase";
import { Video } from "../types";

interface AddVideoModalProps {
  onClose: () => void;
  onVideoAdded: (video: Video) => void;
}

// Function to extract youtube id from various URL formats
function extractYoutubeId(url: string): string {
  const trimmed = url.trim();
  if (trimmed.length === 11) {
    return trimmed; // already just the ID
  }
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|\&v=)([^#\&\?]*).*/;
  const match = trimmed.match(regExp);
  return (match && match[2].length === 11) ? match[2] : trimmed;
}

const CATEGORIES = [
  "React & Next.js",
  "TypeScript",
  "CSS & Design",
  "DevOps & Cloud",
  "General",
  "Custom Syllabus"
];

export default function AddVideoModal({ onClose, onVideoAdded }: AddVideoModalProps) {
  const [videoName, setVideoName] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [category, setCategory] = useState("React & Next.js");
  const [customCategory, setCustomCategory] = useState("");
  const [duration, setDuration] = useState("15:00");
  const [isPremiumOnly, setIsPremiumOnly] = useState(false);
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const name = videoName.trim();
    if (!name) {
      setError("Please specify a Lecture Title.");
      return;
    }

    const rawId = youtubeUrl.trim();
    if (!rawId) {
      setError("Please specify a YouTube Link or Video ID.");
      return;
    }

    const youtubeId = extractYoutubeId(rawId);
    if (youtubeId.length !== 11) {
      setError("Invalid YouTube ID. It must be exactly 11 characters long.");
      return;
    }

    setIsLoading(true);
    const finalCategory = category === "Custom Syllabus" && customCategory.trim() 
      ? customCategory.trim() 
      : category;

    const { video, error: dbError } = await dbService.addVideo(
      name,
      youtubeId,
      finalCategory,
      duration.trim() || "12:30",
      isPremiumOnly
    );

    setIsLoading(false);

    if (dbError || !video) {
      setError(dbError || "Failed to add lecture. Please try again.");
    } else {
      onVideoAdded(video);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="bg-white w-full max-w-lg rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Header */}
        <div className="flex justify-between items-center bg-slate-50 border-b border-slate-100 px-6 py-4.5">
          <div className="flex items-center space-x-2.5">
            <div className="bg-blue-50 text-blue-600 p-2 rounded-xl">
              <VideoIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-slate-800 text-base">Add New Lecture Video</h3>
              <p className="text-[11px] text-slate-400 font-medium">Add any YouTube lecture to the curriculum</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto">
          {error && (
            <div className="p-3.5 bg-red-50 border border-red-100 rounded-xl flex items-start space-x-2 text-xs font-semibold text-red-600">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
              Lecture Title
            </label>
            <div className="relative">
              <FileVideo className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
              <input
                type="text"
                required
                placeholder="e.g. Intro to React Hooks & Memoization"
                value={videoName}
                onChange={(e) => setVideoName(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm text-slate-800"
              />
            </div>
          </div>

          {/* YouTube link or ID */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
              YouTube Link or Video ID
            </label>
            <input
              type="text"
              required
              placeholder="e.g. https://www.youtube.com/watch?v=81P_K8v_XbM or 81P_K8v_XbM"
              value={youtubeUrl}
              onChange={(e) => setYoutubeUrl(e.target.value)}
              className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm text-slate-800 font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1 font-mono">
              Supports standard watch links, share shorts, embed codes, or raw 11-char IDs.
            </p>
          </div>

          {/* Grid fields */}
          <div className="grid grid-cols-2 gap-4">
            {/* Category selection */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                Category
              </label>
              <div className="relative">
                <Tag className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm text-slate-800 appearance-none"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Lecture duration */}
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                Duration (MM:SS)
              </label>
              <div className="relative">
                <Clock className="absolute left-3 top-3.5 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="e.g. 18:45"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full pl-9 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm text-slate-800 font-mono"
                />
              </div>
            </div>
          </div>

          {/* Custom category box */}
          {category === "Custom Syllabus" && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="pt-1"
            >
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                Enter Custom Category Name
              </label>
              <input
                type="text"
                placeholder="e.g. Advanced Databases"
                value={customCategory}
                onChange={(e) => setCustomCategory(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/10 focus:border-blue-500 text-sm text-slate-800"
              />
            </motion.div>
          )}

          {/* Premium Checkbox */}
          <div className="pt-2">
            <label className="flex items-center space-x-3 bg-slate-50 border border-slate-200/60 p-4 rounded-xl hover:bg-slate-100/55 transition cursor-pointer">
              <input
                type="checkbox"
                checked={isPremiumOnly}
                onChange={(e) => setIsPremiumOnly(e.target.checked)}
                className="w-4.5 h-4.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
              />
              <div className="flex-1">
                <span className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                  💎 Require Premium Account Status
                </span>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Only students with a simulated Premium status will be allowed to view this course.
                </p>
              </div>
            </label>
          </div>

          {/* Buttons */}
          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 font-bold py-3.5 rounded-xl transition text-sm cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 rounded-xl transition text-sm flex items-center justify-center space-x-2 cursor-pointer shadow-md"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>Publish Lecture</span>
                </>
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
