import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Sparkles, Check, Key, User as UserIcon, Lock, Copy, Eye, EyeOff } from "lucide-react";
import { dbService } from "../lib/supabase";
import { User } from "../types";

interface AuthModalProps {
  onAuthSuccess: (user: User) => void;
}

export default function AuthModal({ onAuthSuccess }: AuthModalProps) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [userIdCode, setUserIdCode] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Success state for registration
  const [showSuccessCard, setShowSuccessCard] = useState(false);
  const [generatedCode, setGeneratedCode] = useState("----");
  const [copied, setCopied] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const pw = password.trim();
    if (!pw) {
      setErrorMessage("Please fill out your password.");
      return;
    }

    setIsLoading(true);

    if (isLogin) {
      const code = userIdCode.trim().toUpperCase();
      if (!code) {
        setErrorMessage("Enter your User ID Code!");
        setIsLoading(false);
        return;
      }

      const { user, error } = await dbService.loginUser(code, pw);
      setIsLoading(false);

      if (error || !user) {
        setErrorMessage(error || "Invalid System Verification Code or Wrong Password.");
      } else {
        localStorage.setItem("vid_course_user", JSON.stringify(user));
        onAuthSuccess(user);
      }
    } else {
      const name = username.trim();
      if (!name) {
        setErrorMessage("Please specify a Username!");
        setIsLoading(false);
        return;
      }

      const { userCode, error } = await dbService.registerUser(name, pw);
      setIsLoading(false);

      if (error || !userCode) {
        setErrorMessage(error || "Registration failed. Please try again.");
      } else {
        setGeneratedCode(userCode);
        setShowSuccessCard(true);
      }
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(generatedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProceedToLogin = () => {
    setShowSuccessCard(false);
    setUsername("");
    setPassword("");
    setUserIdCode(generatedCode);
    setIsLogin(true);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 p-8 relative overflow-hidden flex flex-col">
        
        {/* Brand Accent */}
        <div className="text-center space-y-1.5 mb-6">
          <div className="flex items-center justify-center gap-2.5 mb-1">
            <img 
              src="/logo.png" 
              alt="Vidcourse Logo" 
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-xl object-cover shadow-md border border-slate-100"
            />
            <span className="text-3xl font-display font-black text-blue-600 tracking-tight">vid.course</span>
          </div>
          <p className="text-xs text-slate-400 font-mono uppercase tracking-widest font-semibold">
            {isLogin ? "Log in to view courses" : "Create a new student profile"}
          </p>
        </div>

        {/* Tab Switcher */}
        {!showSuccessCard && (
          <div className="flex border-b border-slate-100 text-sm font-semibold text-center mb-6 relative">
            <button
              onClick={() => {
                setIsLogin(true);
                setErrorMessage(null);
              }}
              className={`flex-1 pb-3 cursor-pointer transition-colors duration-200 relative ${
                isLogin ? "text-blue-600 font-bold" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Login
              {isLogin && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                />
              )}
            </button>
            <button
              onClick={() => {
                setIsLogin(false);
                setErrorMessage(null);
              }}
              className={`flex-1 pb-3 cursor-pointer transition-colors duration-200 relative ${
                !isLogin ? "text-blue-600 font-bold" : "text-slate-400 hover:text-slate-600"
              }`}
            >
              Register
              {!isLogin && (
                <motion.div
                  layoutId="activeTabUnderline"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600"
                />
              )}
            </button>
          </div>
        )}

        {/* Form Container */}
        <AnimatePresence mode="wait">
          {!showSuccessCard ? (
            <motion.form
              key={isLogin ? "login" : "register"}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.15 }}
              onSubmit={handleSubmit}
              className="space-y-4"
            >
              {errorMessage && (
                <div className="p-3.5 bg-red-50 border border-red-200 rounded-xl text-xs font-semibold text-red-600 text-center">
                  {errorMessage}
                </div>
              )}

              {/* Login only: User ID Code */}
              {isLogin ? (
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                    User ID Code
                  </label>
                  <div className="relative">
                    <Key className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g., B4812"
                      value={userIdCode}
                      onChange={(e) => setUserIdCode(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl uppercase font-mono tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm placeholder:lowercase placeholder:font-sans placeholder:tracking-normal text-slate-800"
                    />
                  </div>
                </div>
              ) : (
                /* Register only: Username */
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                    Full Name
                  </label>
                  <div className="relative">
                    <UserIcon className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Enter your name"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full pl-10 pr-4 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-800"
                    />
                  </div>
                </div>
              )}

              {/* Password field */}
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5 font-mono">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 text-sm text-slate-800 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-slate-400 hover:text-slate-600 focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4.5 h-4.5" /> : <Eye className="w-4.5 h-4.5" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white font-bold py-3.5 rounded-xl transition shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 text-sm cursor-pointer mt-2 flex items-center justify-center space-x-2"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <span>{isLogin ? "Sign In" : "Create Student Account"}</span>
                )}
              </button>
            </motion.form>
          ) : (
            /* Victory / Registration Complete Screen */
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="flex flex-col items-center justify-center text-center space-y-5 py-4"
            >
              <div className="bg-emerald-100 p-4 rounded-full text-emerald-600 animate-bounce">
                <Check className="w-8 h-8 stroke-[3]" />
              </div>
              
              <div className="space-y-1.5">
                <h2 className="text-2xl font-display font-bold text-slate-800">Registration Complete!</h2>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Copy your unique system verification code below. You must use this code and your password to sign in next time.
                </p>
              </div>

              {/* Code Box */}
              <div className="w-full flex items-center justify-between bg-slate-50 border border-slate-200 px-5 py-4 rounded-2xl relative group">
                <div className="flex flex-col text-left">
                  <span className="text-[10px] text-slate-400 font-mono uppercase tracking-wider font-bold">Your ID Code</span>
                  <span className="text-2xl font-mono font-black text-blue-600 tracking-widest">{generatedCode}</span>
                </div>
                <button
                  onClick={handleCopyCode}
                  className="bg-white border border-slate-200 hover:border-slate-300 p-2.5 rounded-xl shadow-xs transition hover:bg-slate-50 active:scale-95 text-slate-500 hover:text-slate-700 flex items-center justify-center cursor-pointer"
                  title="Copy Code"
                >
                  {copied ? (
                    <span className="text-xs text-emerald-600 font-bold flex items-center gap-1">
                      <Check className="w-4 h-4" /> Copied!
                    </span>
                  ) : (
                    <Copy className="w-4.5 h-4.5" />
                  )}
                </button>
              </div>

              <button
                onClick={handleProceedToLogin}
                className="w-full bg-slate-800 hover:bg-slate-900 text-white font-bold text-sm py-3 rounded-xl transition cursor-pointer"
              >
                Proceed to Login
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Brand signature */}
        <div className="text-[10px] text-center text-slate-300 tracking-widest uppercase font-mono font-bold mt-6 pt-4 border-t border-slate-50">
          Created by Ikaris
        </div>
      </div>
    </div>
  );
}
