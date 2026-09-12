import { useEffect, useState, useRef } from "react";
import { PhoneOff, Mic, MicOff, Play, Pause, Volume2, ShieldAlert, Award } from "lucide-react";
import { initiateCall, type User } from "../../services/api";

interface DialerModalProps {
  user: User;
  callType: 'Standard Call' | 'Emergency Call' | 'Recruiter Support Call';
  onClose: () => void;
}

export function DialerModal({ user, callType, onClose }: DialerModalProps) {
  const [status, setStatus] = useState<"connecting" | "ringing" | "connected" | "ended">("connecting");
  const [duration, setDuration] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [isOnHold, setIsOnHold] = useState(false);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const callDurationRef = useRef(0);

  useEffect(() => {
    // 1. Simulate connecting (1.5 seconds)
    const connTimer = setTimeout(() => {
      setStatus("ringing");
    }, 1200);

    // 2. Simulate ringing, then user answers (after 2.5 seconds of ringing)
    const ringTimer = setTimeout(() => {
      setStatus("connected");
    }, 3800);

    return () => {
      clearTimeout(connTimer);
      clearTimeout(ringTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Timer for active call duration
  useEffect(() => {
    if (status === "connected" && !isOnHold) {
      timerRef.current = setInterval(() => {
        setDuration(prev => {
          const next = prev + 1;
          callDurationRef.current = next;
          return next;
        });
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status, isOnHold]);

  const handleEndCall = async () => {
    setStatus("ended");
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    // Determine final status
    let callStatus: 'Completed' | 'Missed' | 'No Answer' = 'Missed';
    if (duration > 0) {
      callStatus = 'Completed';
    } else if (status === 'ringing') {
      callStatus = 'No Answer';
    }

    try {
      await initiateCall({
        recipientId: user.id,
        duration: callDurationRef.current,
        status: callStatus,
        type: callType
      });
    } catch (err) {
      console.error("Failed to log call:", err);
    }

    // Close dialer modal after a short delay to show "Call Ended"
    setTimeout(() => {
      onClose();
    }, 1200);
  };

  // Format seconds to mm:ss
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const getThemeColors = () => {
    if (callType === 'Emergency Call') {
      return {
        bg: "bg-red-950/80 border-red-500/30",
        pill: "bg-red-500/20 text-red-400 border border-red-500/30",
        icon: <ShieldAlert className="h-5 w-5 animate-pulse text-red-400" />
      };
    }
    if (callType === 'Recruiter Support Call') {
      return {
        bg: "bg-indigo-950/80 border-indigo-500/30",
        pill: "bg-indigo-500/20 text-indigo-400 border border-indigo-500/30",
        icon: <Award className="h-5 w-5 text-indigo-400" />
      };
    }
    return {
      bg: "bg-slate-950/80 border-slate-700/30",
      pill: "bg-blue-500/20 text-blue-400 border border-blue-500/30",
      icon: <Volume2 className="h-5 w-5 text-blue-400" />
    };
  };

  const theme = getThemeColors();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-md px-4">
      <div className={`w-full max-w-sm rounded-3xl border ${theme.bg} p-6 shadow-2xl backdrop-blur-xl text-center space-y-6 animate-scaleIn`}>
        {/* Call Type Pill */}
        <div className="flex justify-center">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wider ${theme.pill}`}>
            {theme.icon}
            {callType}
          </span>
        </div>

        {/* User Profile */}
        <div className="flex flex-col items-center space-y-4">
          <div className="relative">
            {/* Pulsing ring during calling/ringing */}
            {(status === "connecting" || status === "ringing") && (
              <div className="absolute inset-0 -m-3 animate-ping rounded-full border border-blue-500/30" />
            )}
            {/* Double ring for emergency */}
            {callType === 'Emergency Call' && status === "connected" && (
              <div className="absolute inset-0 -m-2 animate-pulse rounded-full border-2 border-red-500/20" />
            )}
            {user.avatar ? (
              <img
                src={user.avatar}
                alt={user.name}
                className="h-24 w-24 rounded-full border-2 border-white/10 object-cover shadow-lg"
              />
            ) : (
              <div className="flex h-24 w-24 items-center justify-center rounded-full bg-blue-600 font-bold text-white text-3xl shadow-lg">
                {user.name.split(" ").map(n => n[0]).join("")}
              </div>
            )}
          </div>
          <div>
            <h3 className="text-xl font-bold text-white">{user.name}</h3>
            <p className="text-xs text-slate-400 mt-1">
              {callType === 'Emergency Call' ? user.emergencyPhone : user.phone || "No phone set"}
            </p>
          </div>
        </div>

        {/* Dialer Status Text */}
        <div className="space-y-1">
          <p className="text-sm font-semibold text-slate-300 capitalize">
            {status === "connecting" && "Connecting call..."}
            {status === "ringing" && "Ringing..."}
            {status === "connected" && (isOnHold ? "Call on Hold" : "Active Call")}
            {status === "ended" && "Call Ended"}
          </p>
          {status === "connected" && (
            <p className="text-3xl font-bold font-mono text-white tracking-wider animate-fadeIn">
              {formatTime(duration)}
            </p>
          )}
        </div>

        {/* Audio Visualizer Waves (Connected only) */}
        {status === "connected" && !isOnHold && (
          <div className="flex justify-center items-end gap-1 h-8">
            <span className="w-1 h-3 bg-blue-500 rounded-full animate-audioWave1" />
            <span className="w-1 h-6 bg-indigo-500 rounded-full animate-audioWave2" />
            <span className="w-1 h-4 bg-purple-500 rounded-full animate-audioWave3" />
            <span className="w-1 h-7 bg-blue-500 rounded-full animate-audioWave2" />
            <span className="w-1 h-3 bg-indigo-500 rounded-full animate-audioWave1" />
          </div>
        )}

        {/* Dialer controls */}
        <div className="flex justify-center gap-6 pt-2">
          {/* Mute Button */}
          <button
            type="button"
            disabled={status !== "connected"}
            onClick={() => setIsMuted(!isMuted)}
            className={`flex h-12 w-12 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-30 ${
              isMuted
                ? "bg-amber-500 border-amber-400 text-white"
                : "border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            {isMuted ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* End Call Button */}
          <button
            type="button"
            onClick={handleEndCall}
            className="flex h-14 w-14 items-center justify-center rounded-full bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-500/20 transform active:scale-95 transition"
          >
            <PhoneOff className="h-6 w-6" />
          </button>

          {/* Hold Button */}
          <button
            type="button"
            disabled={status !== "connected"}
            onClick={() => setIsOnHold(!isOnHold)}
            className={`flex h-12 w-12 items-center justify-center rounded-full border transition disabled:cursor-not-allowed disabled:opacity-30 ${
              isOnHold
                ? "bg-blue-600 border-blue-500 text-white"
                : "border-slate-700 bg-slate-800/40 text-slate-300 hover:bg-slate-700 hover:text-white"
            }`}
          >
            {isOnHold ? <Play className="h-5 w-5" /> : <Pause className="h-5 w-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}
