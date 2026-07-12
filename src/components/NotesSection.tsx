import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  BookOpen, Plus, Trash2, Clock, Calendar, Check, 
  ChevronRight, Award, Edit3, ShieldAlert 
} from "lucide-react";
import { Video, LectureNote } from "../types";

interface NotesSectionProps {
  activeVideo: Video;
  userCode: string;
}

export default function NotesSection({ activeVideo, userCode }: NotesSectionProps) {
  const [notes, setNotes] = useState<LectureNote[]>([]);
  const [noteText, setNoteText] = useState("");
  const [timestamp, setTimestamp] = useState(""); // optional timestamp like "04:15"
  const [isSuccess, setIsSuccess] = useState(false);

  // Load notes on mount/video change
  useEffect(() => {
    const allNotes: LectureNote[] = JSON.parse(localStorage.getItem("vid_course_notes") || "[]");
    const filteredNotes = allNotes.filter(
      (n) => n.video_id === String(activeVideo.id || activeVideo.youtube_id) && n.user_code === userCode
    );
    setNotes(filteredNotes.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()));
  }, [activeVideo, userCode]);

  const handleAddNote = (e: React.FormEvent) => {
    e.preventDefault();
    const text = noteText.trim();
    if (!text) return;

    const newNote: LectureNote = {
      id: "note_" + Math.random().toString(36).substr(2, 9),
      video_id: String(activeVideo.id || activeVideo.youtube_id),
      user_code: userCode,
      note_text: text,
      timestamp: timestamp.trim() || undefined,
      created_at: new Date().toISOString()
    };

    const allNotes: LectureNote[] = JSON.parse(localStorage.getItem("vid_course_notes") || "[]");
    allNotes.unshift(newNote);
    localStorage.setItem("vid_course_notes", JSON.stringify(allNotes));

    setNotes([newNote, ...notes]);
    setNoteText("");
    setTimestamp("");
    setIsSuccess(true);
    setTimeout(() => setIsSuccess(false), 2000);
  };

  const handleDeleteNote = (id: string) => {
    const allNotes: LectureNote[] = JSON.parse(localStorage.getItem("vid_course_notes") || "[]");
    const updated = allNotes.filter((n) => n.id !== id);
    localStorage.setItem("vid_course_notes", JSON.stringify(updated));
    setNotes(notes.filter((n) => n.id !== id));
  };

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 p-5 sm:p-6 space-y-6">
      
      {/* Title Header */}
      <div className="flex items-center space-x-2.5 pb-4 border-b border-slate-100">
        <div className="bg-indigo-50 text-indigo-600 p-2 rounded-xl">
          <BookOpen className="w-5 h-5" />
        </div>
        <div>
          <h3 className="font-display font-bold text-slate-800 text-base">Lecture Takeaways & Notes</h3>
          <p className="text-[11px] text-slate-400 font-medium">Capture personal checkpoints, timestamps, and lessons</p>
        </div>
      </div>

      {/* Note Creator Form */}
      <form onSubmit={handleAddNote} className="space-y-3.5">
        <div>
          <textarea
            rows={3}
            placeholder={`What are your main takeaways from "${activeVideo.video_name}"?`}
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            className="w-full p-4 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 text-sm text-slate-800 placeholder:text-slate-400 leading-relaxed"
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
          {/* Timestamp input field */}
          <div className="flex items-center space-x-2">
            <div className="relative w-full sm:w-36">
              <Clock className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Stamp e.g. 05:40"
                value={timestamp}
                onChange={(e) => setTimestamp(e.target.value)}
                className="w-full pl-9 pr-3 py-2 border border-slate-200 rounded-xl focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 text-xs text-slate-800 font-mono"
              />
            </div>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">
              (Optional)
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            className={`px-5 py-2.5 rounded-xl font-bold text-xs transition cursor-pointer flex items-center justify-center space-x-2 ${
              isSuccess 
                ? "bg-emerald-600 text-white" 
                : "bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs"
            }`}
          >
            {isSuccess ? (
              <>
                <Check className="w-4.5 h-4.5 stroke-[3]" />
                <span>Note Logged!</span>
              </>
            ) : (
              <>
                <Plus className="w-4.5 h-4.5" />
                <span>Log Takeaway</span>
              </>
            )}
          </button>
        </div>
      </form>

      {/* Notes List */}
      <div className="space-y-3.5">
        <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
          My Saved Notebook ({notes.length})
        </h4>

        <AnimatePresence initial={false}>
          {notes.length === 0 ? (
            <div className="bg-slate-50/50 border border-dashed border-slate-200/80 rounded-xl p-8 text-center text-slate-400">
              <Edit3 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-medium">No notes taken for this video yet.</p>
              <p className="text-[10px] mt-0.5">Your takeaways will show up here to help you study!</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
              {notes.map((note) => (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, x: -15 }}
                  className="bg-slate-50 border border-slate-100 p-3.5 rounded-xl flex items-start justify-between space-x-3 hover:shadow-2xs transition"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <p className="text-xs text-slate-700 leading-relaxed break-words whitespace-pre-wrap">
                      {note.note_text}
                    </p>
                    
                    <div className="flex items-center space-x-3 text-[10px] text-slate-400 font-mono font-medium">
                      {note.timestamp && (
                        <span className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          <span>{note.timestamp}</span>
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        <span>{new Date(note.created_at).toLocaleDateString()}</span>
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteNote(note.id)}
                    className="text-slate-300 hover:text-red-600 p-1 rounded-lg hover:bg-slate-100/80 transition shrink-0 cursor-pointer"
                    title="Delete Note"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </motion.div>
              ))}
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
