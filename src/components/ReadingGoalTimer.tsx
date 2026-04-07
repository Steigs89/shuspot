import React, { useEffect, useState, useRef } from "react";
import { useTranslation } from "../contexts/LanguageContext";
import "./ReadingGoalTimer.css";

const todayKey = () => new Date().toISOString().split("T")[0];

interface Props {
  goalMinutes?: number;
  isReading?: boolean;
}

const ReadingGoalTimer: React.FC<Props> = ({ goalMinutes = 5, isReading = false }) => {
  const [seconds, setSeconds] = useState(0);
  const [streak, setStreak] = useState(0);
  const [completedToday, setCompletedToday] = useState(false);
  const [showReward, setShowReward] = useState(false);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const { t } = useTranslation();
  
  const requiredSec = goalMinutes * 60;
  const progress = Math.min(seconds / requiredSec, 1);
  const minutesRead = Math.floor(seconds / 60);
  
  // For testing - show 40% progress if no time tracked
  const displayProgress = seconds === 0 ? 0.4 : progress;

  useEffect(() => {
    const saved = localStorage.getItem("reading-progress");
    if (saved) {
      try {
        const data = JSON.parse(saved);
        if (data.date === todayKey()) {
          setSeconds(data.seconds || 0);
          setStreak(data.streak ?? 0);
          setCompletedToday(data.completed ?? false);
        } else {
          const yesterday = new Date();
          yesterday.setDate(yesterday.getDate() - 1);
          const yesterdayKey = yesterday.toISOString().split("T")[0];
          if (data.date === yesterdayKey && data.completed) {
            setStreak(data.streak ?? 0);
          } else {
            setStreak(0);
          }
          setSeconds(0);
          setCompletedToday(false);
        }
      } catch {
        setSeconds(0);
        setStreak(0);
        setCompletedToday(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isReading) {
      intervalRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isReading]);

  useEffect(() => {
    localStorage.setItem("reading-progress", JSON.stringify({
      date: todayKey(), seconds, streak, completed: completedToday,
    }));
    if (!completedToday && seconds >= requiredSec) {
      setCompletedToday(true);
      setStreak((prev) => prev + 1);
      setShowReward(true);
      setTimeout(() => setShowReward(false), 3500);
    }
  }, [seconds, completedToday, requiredSec, streak]);

  // Circle math - using stroke-dasharray for reliable arc rendering
  const size = 220;
  const strokeWidth = 24; // Thicker stroke to fully cover white background
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const halfCircumference = circumference / 2; // We only show top half
  
  // Progress as portion of half circle
  const progressOffset = halfCircumference - (displayProgress * halfCircumference);
  
  // Calculate star position at end of progress arc
  // Arc goes from 180° (left) to 0° (right), progress fills from left
  // So at displayProgress, the angle is: 180 - (displayProgress * 180)
  const progressAngle = Math.PI - (displayProgress * Math.PI); // in radians
  const starX = size / 2 + radius * Math.cos(progressAngle);
  const starY = size / 2 - radius * Math.sin(progressAngle);

  return (
    <div className="goal-wrapper">
      {showReward && (
        <div className="reward-popup">
          <h3>🎉 {t('reading.goal.completed', 'Goal Completed!')}</h3>
          <p>{t('reading.goal.earned.star', 'You earned a ⭐ for reading today!')}</p>
          <div className="streak">🔥 {streak} {t('reading.streak')}</div>
        </div>
      )}
      
      <div className="goal-timer-container">
        <svg 
          className="arc-svg" 
          width={size} 
          height={size / 2 + strokeWidth}
          viewBox={`0 0 ${size} ${size / 2 + strokeWidth}`}
        >
          <defs>
            <linearGradient id="shuspot-pink-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#FF6B9D" />
              <stop offset="50%" stopColor="#FF8FB3" />
              <stop offset="100%" stopColor="#FFB3C9" />
            </linearGradient>
          </defs>
          
          {/* White fill inside the arc */}
          <path
            d={`M ${strokeWidth / 2} ${size / 2} 
                A ${radius - strokeWidth / 2} ${radius - strokeWidth / 2} 0 0 1 ${size - strokeWidth / 2} ${size / 2}
                L ${size - strokeWidth / 2} ${size / 2 + strokeWidth}
                L ${strokeWidth / 2} ${size / 2 + strokeWidth}
                Z`}
            fill="white"
          />
          
          {/* Background arc (gray) */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="#e5e5e5"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${halfCircumference} ${circumference}`}
            transform={`rotate(180 ${size / 2} ${size / 2})`}
          />
          
          {/* Progress arc (ShuSpot pink gradient) - SAME circle, SAME radius */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke="url(#shuspot-pink-gradient)"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${halfCircumference} ${circumference}`}
            strokeDashoffset={progressOffset}
            transform={`rotate(180 ${size / 2} ${size / 2})`}
          />
        </svg>
        
        <div className="goal-center">
          <h2>{seconds === 0 ? 2 : minutesRead}</h2>
          <p><strong>{t('reading.minutes.today')}</strong></p>
        </div>
        
        {/* Star with goal number at end of progress arc */}
        <div 
          className="progress-star-container"
          style={{
            position: 'absolute',
            left: `${starX}px`,
            top: `${starY + 5}px`,
            transform: 'translate(-50%, -50%)',
            zIndex: 10,
            width: '48px',
            height: '48px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <span style={{ fontSize: '48px', position: 'absolute' }}>⭐</span>
          <span style={{ 
            position: 'relative', 
            zIndex: 11, 
            fontSize: '16px', 
            fontWeight: 800, 
            color: '#1a365d',
            marginTop: '-2px'
          }}>
            {goalMinutes}
          </span>
        </div>
      </div>
    </div>
  );
};

export default ReadingGoalTimer;
