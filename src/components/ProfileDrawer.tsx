import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { 
  X, LogOut, ShieldAlert, Award, Star, 
  Sparkles, GraduationCap, CheckCircle, Clock, BookOpen, Heart, Flame,
  CreditCard, AlertCircle
} from "lucide-react";
import { User, LectureNote, WatchHistory, Video } from "../types";
import { dbService, supabase } from "../lib/supabase";

declare const PaystackPop: any;

interface ProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
  onUpdateUser: (updatedUser: User) => void;
  history: WatchHistory[];
  notesCount: number;
  videos: Video[];
  onPlayVideo: (video: Video) => void;
}

export default function ProfileDrawer({ 
  isOpen, 
  onClose, 
  user, 
  onLogout, 
  onUpdateUser,
  history,
  notesCount,
  videos,
  onPlayVideo
}: ProfileDrawerProps) {
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);
  const [playlist, setPlaylist] = useState<string[]>([]);
  const [loadingPlaylist, setLoadingPlaylist] = useState(false);
  const [paystackMessage, setPaystackMessage] = useState<{type: "success" | "error" | "info", text: string} | null>(null);
  const [showSimulationModal, setShowSimulationModal] = useState(false);

  const completedCount = history.filter(h => h.completed).length;

  React.useEffect(() => {
    if (isOpen && user) {
      const loadPlaylist = async () => {
        setLoadingPlaylist(true);
        try {
          const ids = await dbService.fetchPlaylist(user.user_code);
          setPlaylist(ids);
        } catch (err) {
          console.error("Failed to load playlist", err);
        } finally {
          setLoadingPlaylist(false);
        }
      };
      loadPlaylist();
    }
  }, [isOpen, user]);

  const handleRemoveFromPlaylist = async (youtubeId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await dbService.removeFromPlaylist(user.user_code, youtubeId);
      setPlaylist(prev => prev.filter(id => id !== youtubeId));
    } catch (err) {
      console.error("Failed to remove from playlist", err);
    }
  };

  // Find full video details for items in user's playlist
  const playlistVideos = videos.filter(v => 
    playlist.includes(v.youtube_id) || playlist.includes(String(v.id))
  );

  const handleTogglePremium = async () => {
    const targetStatus = !user.is_premium;
    
    if (targetStatus) {
      // Simulate nice upgrading spinner
      setIsUpgrading(true);
      setTimeout(async () => {
        await dbService.toggleUserPremium(user.user_code, true);
        const updatedUser = { ...user, is_premium: true };
        onUpdateUser(updatedUser);
        setIsUpgrading(false);
        setUpgradeSuccess(true);
        setTimeout(() => setUpgradeSuccess(false), 3000);
      }, 1200);
    } else {
      await dbService.toggleUserPremium(user.user_code, false);
      const updatedUser = { ...user, is_premium: false };
      onUpdateUser(updatedUser);
    }
  };

  const handlePaymentSuccess = async (reference: string) => {
    const activeUserSession = user;
    if (!activeUserSession) return;

    const subscriptionAmount = 2500;
    setPaystackMessage({ type: "success", text: 'Payment successful! Reference: ' + reference });
    
    // 1. Calculate +30 days expiry date window
    const oneMonthFromNow = new Date();
    oneMonthFromNow.setMonth(oneMonthFromNow.getMonth() + 1);

    let updatedUser: User | null = null;
    let dbSuccess = false;

    // 2. Update the user account to Premium status in Supabase
    if (activeUserSession.id) {
      try {
        const { data, error: userError } = await supabase
            .from('users')
            .update({
                is_premium: true,
                premium_until: oneMonthFromNow.toISOString()
            })
            .eq('id', activeUserSession.id)
            .select()
            .single();

        if (userError) {
            console.warn("Error updating account via id:", userError.message);
        } else if (data) {
            updatedUser = data as User;
            dbSuccess = true;
        }
      } catch (err) {
        console.warn("Supabase query error", err);
      }
    }

    // Fallback via user_code if id update failed or id wasn't present
    if (!dbSuccess) {
      try {
        const { data, error: userError } = await supabase
            .from('users')
            .update({
                is_premium: true,
                premium_until: oneMonthFromNow.toISOString()
            })
            .eq('user_code', activeUserSession.user_code)
            .select()
            .single();

        if (userError) {
            console.warn("Error updating account via user_code:", userError.message);
        } else if (data) {
            updatedUser = data as User;
            dbSuccess = true;
        }
      } catch (err) {
        console.warn("Supabase query error via user_code", err);
      }
    }

    // Local fallback
    if (!updatedUser) {
      updatedUser = {
        ...activeUserSession,
        is_premium: true,
        premium_until: oneMonthFromNow.toISOString()
      };
      const localUsers: User[] = JSON.parse(localStorage.getItem('vid_course_fallback_users') || '[]');
      const idx = localUsers.findIndex(u => u.user_code === activeUserSession.user_code);
      if (idx !== -1) {
        localUsers[idx].is_premium = true;
        localUsers[idx].premium_until = oneMonthFromNow.toISOString();
        localStorage.setItem('vid_course_fallback_users', JSON.stringify(localUsers));
      }
    }

    // 3. Insert the payment amount into your transactions table for the Admin Balance
    if (dbSuccess && activeUserSession.id) {
      try {
        const { error: txError } = await supabase
            .from('transactions')
            .insert([
                { user_id: activeUserSession.id, amount: subscriptionAmount }
            ]);
        if (txError) {
          console.warn("Error inserting transaction:", txError.message);
        }
      } catch (err) {
        console.warn("Transactions query failed:", err);
      }
    }

    // Local transactions backup
    const localTx = JSON.parse(localStorage.getItem('vid_course_transactions') || '[]');
    localTx.push({
      user_id: activeUserSession.id || activeUserSession.user_code,
      amount: subscriptionAmount,
      created_at: new Date().toISOString()
    });
    localStorage.setItem('vid_course_transactions', JSON.stringify(localTx));

    // Refresh cached user status sync across your app UI layout
    localStorage.setItem('vid_course_user', JSON.stringify(updatedUser));
    
    // To be robust against custom external snippets that look for checkUserSession()
    if (updatedUser) {
      onUpdateUser(updatedUser);
    }
    
    // Define or select profileDrawer to prevent reference error if users copy direct code
    const profileDrawer = document.getElementById('profileDrawer') || {
      classList: {
        add: (c: string) => {
          console.log("Adding class to profile drawer mock", c);
        }
      }
    };
    
    if (profileDrawer && typeof profileDrawer.classList?.add === "function") {
      profileDrawer.classList.add('translate-x-full');
    }

    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const payWithPaystack = () => {
    const activeUserSession = user;
    if (!activeUserSession) {
      setPaystackMessage({ type: "error", text: "Please log in to upgrade!" });
      return;
    }

    const subscriptionAmount = 2500; // Set your monthly fee in Naira

    if (typeof PaystackPop === "undefined") {
      // Gracefully trigger the sandbox simulation modal if Paystack fails to load due to iframe boundaries
      setShowSimulationModal(true);
      return;
    }

    setPaystackMessage({ type: "info", text: "Initializing Paystack Checkout secure frame..." });

    const handler = PaystackPop.setup({
        key: 'pk_test_2add9957df97852f33e83798cd59302c312f2265', // Replace with your Public Key from Paystack Dashboard
        email: 'student@vidcourse.com', // You can use a dummy email or capture real user emails
        amount: subscriptionAmount * 100, // Paystack counts in Kobo (e.g., 2500 Naira = 250000 Kobo)
        currency: 'NGN',
        
        callback: async function(response: any) {
            handlePaymentSuccess(response.reference);
        },
        onClose: function() {
            setPaystackMessage({ type: "info", text: "Transaction was cancelled by user." });
            setTimeout(() => setPaystackMessage(null), 4000);
        }
    });

    handler.openIframe();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-slate-950 z-40"
          />

          {/* Drawer Panel */}
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 20, stiffness: 150 }}
            className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-50 border-l border-slate-100 p-6 flex flex-col justify-between overflow-y-auto"
          >
            {/* Header */}
            <div>
              <div className="flex justify-between items-center border-b border-slate-100 pb-4.5 mb-6">
                <div className="flex items-center space-x-2">
                  <GraduationCap className="w-5 h-5 text-blue-600" />
                  <h3 className="font-display font-bold text-slate-800 text-lg">Student Profile</h3>
                </div>
                <button
                  onClick={onClose}
                  className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-50 transition cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* User Bio */}
              <div className="space-y-5">
                <div className="flex items-center space-x-4 bg-slate-50 p-4.5 rounded-2xl border border-slate-100">
                  <div className="w-14 h-14 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 font-display font-black text-xl border border-blue-200">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-800 text-base leading-tight">{user.username}</h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">Verified vid.course Scholar</p>
                    <div className="mt-1.5 flex items-center space-x-2">
                      <span className="text-[10px] font-mono font-bold text-blue-600 bg-blue-50 border border-blue-100 px-2 py-0.5 rounded-md tracking-wider">
                        CODE: {user.user_code}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Premium Account Section */}
                <div className="bg-slate-50 border border-slate-200/60 rounded-2xl p-4 space-y-3 relative overflow-hidden">
                  {paystackMessage && (
                    <div className={`p-3 rounded-xl text-xs font-semibold text-center border transition-all ${
                      paystackMessage.type === "success" 
                        ? "bg-emerald-50 border-emerald-100 text-emerald-700" 
                        : paystackMessage.type === "error" 
                          ? "bg-rose-50 border-rose-100 text-rose-700" 
                          : "bg-blue-50 border-blue-100 text-blue-700 animate-pulse"
                    }`}>
                      {paystackMessage.text}
                    </div>
                  )}
                  <div>
                    <label className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Premium Account Status</label>
                    <p id="profPremium" className="text-xs font-semibold text-slate-600">
                      {user.is_premium ? "💎 Premium Tier" : "Free Tier"}
                    </p>
                    
                    <button 
                      id="upgradeBtn" 
                      onClick={payWithPaystack}
                      className={`mt-2 w-full bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-3 rounded-xl text-xs transition tracking-wide shadow-xs cursor-pointer flex items-center justify-center gap-1.5 ${user.is_premium ? "hidden" : ""}`}
                    >
                      🌟 Upgrade to Premium (₦2,500/mo)
                    </button>
                  </div>

                  <p className="text-xs text-slate-500 leading-normal">
                    {user.is_premium
                      ? "You have full access to premium lectures, masterclasses, and unrestricted notes history."
                      : "Upgrade to premium to unlock advanced curriculum masterclasses, course resources, and professional tracks."}
                  </p>

                  {/* Demo/Admin Toggle Button */}
                  <div className="pt-1.5 border-t border-slate-100 mt-2">
                    <button
                      onClick={handleTogglePremium}
                      disabled={isUpgrading}
                      className="w-full py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-[10px] font-bold text-slate-500 rounded-lg transition text-center uppercase tracking-wider cursor-pointer"
                    >
                      {isUpgrading ? "Updating..." : user.is_premium ? "Toggle Free Demo (Admin Bypass)" : "Quick Bypass Upgrade (Demo)"}
                    </button>
                  </div>
                </div>

                {/* Performance Stats */}
                <div className="space-y-3">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
                    My Study Stats
                  </h5>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
                      <CheckCircle className="w-5 h-5 text-emerald-500 mx-auto mb-1.5" />
                      <div className="text-xl font-black text-slate-800 font-mono">{completedCount}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Completed</div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
                      <BookOpen className="w-5 h-5 text-indigo-500 mx-auto mb-1.5" />
                      <div className="text-xl font-black text-slate-800 font-mono">{notesCount}</div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Takeaway Notes</div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
                      <Clock className="w-5 h-5 text-blue-500 mx-auto mb-1.5" />
                      <div className="text-xl font-black text-slate-800 font-mono">
                        {(completedCount * 18.5).toFixed(0)}m
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Study Duration</div>
                    </div>

                    <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-100 text-center">
                      <Flame className="w-5 h-5 text-orange-500 mx-auto mb-1.5 animate-pulse" />
                      <div className="text-xl font-black text-slate-800 font-mono">
                        {completedCount > 0 ? "3 Days" : "0 Days"}
                      </div>
                      <div className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Study Streak</div>
                    </div>
                  </div>
                </div>

                {/* Saved Lectures Playlist */}
                <div className="space-y-3 pt-2">
                  <h5 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono flex items-center justify-between">
                    <span>Saved Playlist Summary</span>
                    <span className="text-[10px] text-blue-500 font-bold bg-blue-50 px-1.5 py-0.5 rounded-full font-mono">
                      {playlistVideos.length} {playlistVideos.length === 1 ? 'lecture' : 'lectures'}
                    </span>
                  </h5>
                  
                  {loadingPlaylist ? (
                    <div className="flex items-center justify-center py-6">
                      <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : playlistVideos.length === 0 ? (
                    <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-6 text-center">
                      <p className="text-xs text-slate-400">Your playlist summary is empty.</p>
                      <p className="text-[10px] text-slate-400 mt-1">Add lectures using the action menu in the curriculum feed.</p>
                    </div>
                  ) : (
                    <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                      {playlistVideos.map((video) => (
                        <div
                          key={video.id || video.youtube_id}
                          onClick={() => {
                            onPlayVideo(video);
                            onClose();
                          }}
                          className="group/item flex items-center justify-between p-2.5 bg-slate-50 hover:bg-blue-50 border border-slate-150 hover:border-blue-200 rounded-xl transition cursor-pointer"
                        >
                          <div className="flex items-center space-x-2.5 min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-xs">
                              ▶
                            </div>
                            <div className="min-w-0">
                              <p className="text-[11px] font-bold text-slate-800 truncate leading-tight group-hover/item:text-blue-700">
                                {video.video_name}
                              </p>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                {video.category} • {video.duration || "15:00"}
                              </p>
                            </div>
                          </div>
                          
                          <button
                            onClick={(e) => handleRemoveFromPlaylist(video.youtube_id, e)}
                            className="p-1 text-slate-300 hover:text-red-500 rounded-md hover:bg-red-50 transition opacity-0 group-hover/item:opacity-100 focus:opacity-100"
                            title="Remove from Playlist"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer actions */}
            <div className="border-t border-slate-100 pt-5 space-y-3 mt-6">
              <div className="text-[10px] text-center text-slate-400 tracking-widest uppercase font-mono font-bold">
                Created by Ikaris
              </div>
              <button
                onClick={onLogout}
                className="w-full bg-red-50 hover:bg-red-100 text-red-600 hover:text-red-700 font-bold py-3 rounded-xl text-sm transition cursor-pointer flex items-center justify-center space-x-2"
              >
                <LogOut className="w-4 h-4" />
                <span>Logout Session</span>
              </button>
            </div>
          </motion.div>
        </>
      )}

      {/* High-Fidelity Custom Paystack Sandbox & Iframe Fallback Simulator */}
      {showSimulationModal && (
        <div className="fixed inset-0 bg-slate-950/75 backdrop-blur-xs z-[200] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            className="bg-white w-full max-w-sm rounded-2xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col font-sans"
          >
            {/* Paystack themed brand header */}
            <div className="bg-emerald-600 text-white px-5 py-4 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="font-extrabold tracking-tight text-lg text-emerald-100">
                  pay<span className="text-white">stack</span>
                </span>
                <span className="bg-emerald-500/40 text-emerald-100 text-[9px] font-black uppercase px-2 py-0.5 rounded-full tracking-wider">
                  Sandbox
                </span>
              </div>
              <button 
                onClick={() => setShowSimulationModal(false)}
                className="p-1 hover:bg-emerald-700/50 rounded-lg transition cursor-pointer text-emerald-200 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Info Notice Box */}
            <div className="p-5 space-y-4 flex-1">
              <div className="bg-amber-50 border border-amber-100 p-3 rounded-xl flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-[11px] font-bold text-amber-800 uppercase tracking-wide">Iframe Sandbox Warning</h4>
                  <p className="text-[10px] text-amber-700 leading-normal">
                    Browser security policies occasionally block external CDN scripts (like Paystack) from loading inside the preview sandbox iframe. 
                    <span className="block mt-1 font-semibold">Opening this application in a "New Tab" enables the real Paystack popup natively!</span>
                  </p>
                </div>
              </div>

              {/* Payment Details */}
              <div className="space-y-3 pt-1">
                <div className="flex justify-between items-center text-xs pb-2.5 border-b border-slate-100">
                  <span className="text-slate-400">Account Level</span>
                  <span className="font-bold text-slate-800">Premium Subscription</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2.5 border-b border-slate-100">
                  <span className="text-slate-400">Merchant</span>
                  <span className="font-semibold text-slate-800">Vidcourse Professional</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2.5 border-b border-slate-100">
                  <span className="text-slate-400">Billing Email</span>
                  <span className="font-mono text-slate-600 font-medium text-xs">student@vidcourse.com</span>
                </div>
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-400">Subscription Price</span>
                  <span className="text-base font-black text-slate-900 font-mono">₦2,500.00</span>
                </div>
              </div>

              {/* Input details visual mock */}
              <div className="bg-slate-50 border border-slate-200/50 rounded-xl p-3 space-y-2">
                <div className="flex items-center gap-2 text-slate-400 text-[10px] uppercase tracking-wider font-bold">
                  <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                  <span>Simulated Card Details</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono flex justify-between">
                  <span>Number:</span>
                  <span className="font-semibold text-slate-700">•••• •••• •••• 4321</span>
                </div>
                <div className="text-[11px] text-slate-500 font-mono flex justify-between">
                  <span>Sandbox Mode:</span>
                  <span className="font-semibold text-emerald-600">Active (Instant Activation)</span>
                </div>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="bg-slate-50 border-t border-slate-100 p-4 space-y-2.5">
              <button
                onClick={() => {
                  setShowSimulationModal(false);
                  const simulatedRef = "SIM_PAY_" + Math.random().toString(36).substring(2, 11).toUpperCase();
                  handlePaymentSuccess(simulatedRef);
                }}
                className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-bold py-3 px-4 rounded-xl text-xs transition tracking-wide flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/15 cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Simulate Successful Payment
              </button>
              
              <button
                onClick={() => {
                  setShowSimulationModal(false);
                  setPaystackMessage({ type: "info", text: "Sandbox transaction cancelled by user." });
                  setTimeout(() => setPaystackMessage(null), 4000);
                }}
                className="w-full bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 font-bold py-2 px-4 rounded-xl text-xs transition cursor-pointer text-center"
              >
                Cancel Transaction
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
