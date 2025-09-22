"use client";

import React, { useState, useEffect } from 'react';
import { Card, CardContent } from './card';
import { AchievementNotification } from '@/lib/types';
import { Trophy, X } from 'lucide-react';

interface AchievementPopupProps {
  notification: AchievementNotification;
  onClose: () => void;
  duration?: number;
}

export function AchievementPopup({ 
  notification, 
  onClose, 
  duration = 5000 
}: AchievementPopupProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    // Animate in
    const timer = setTimeout(() => setIsVisible(true), 100);
    
    // Auto-close after duration
    const closeTimer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => {
        onClose();
      }, 300);
    }, duration);

    return () => {
      clearTimeout(timer);
      clearTimeout(closeTimer);
    };
  }, [duration, onClose]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  return (
    <div
      className={`fixed top-4 right-4 z-50 transform transition-all duration-300 ease-in-out ${
        isVisible && !isExiting
          ? 'translate-x-0 opacity-100 scale-100'
          : 'translate-x-full opacity-0 scale-95'
      }`}
    >
      <Card className="w-80 bg-gradient-to-r from-yellow-50 to-orange-50 border-2 border-yellow-300 shadow-lg">
        <CardContent className="p-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-full flex items-center justify-center">
                  <Trophy className="w-6 h-6 text-white" />
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-lg font-bold text-gray-900 mb-1">
                  {notification.achievement.title}
                </h3>
                <p className="text-sm text-gray-600 mb-2">
                  <span className="font-semibold text-blue-600">
                    {notification.playerName}
                  </span>
                </p>
                <p className="text-sm text-gray-700">
                  {notification.achievement.description}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="flex-shrink-0 ml-2 p-1 rounded-full hover:bg-gray-200 transition-colors"
            >
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>
          
          {/* Progress bar */}
          <div className="mt-3 w-full bg-gray-200 rounded-full h-1">
            <div 
              className="bg-gradient-to-r from-yellow-400 to-orange-500 h-1 rounded-full animate-pulse"
              style={{
                animation: `shrink ${duration}ms linear forwards`
              }}
            />
          </div>
        </CardContent>
      </Card>
      
      <style jsx>{`
        @keyframes shrink {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

// Achievement notification manager component
export function AchievementNotificationManager() {
  const [notifications, setNotifications] = useState<AchievementNotification[]>([]);

  useEffect(() => {
    const eventSource = new EventSource('/api/achievements/notifications');
    
    eventSource.onopen = () => {
      // Connection established
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (data.type === 'achievement') {
          const notification: AchievementNotification = data.notification;
          setNotifications(prev => [...prev, notification]);
        }
      } catch (error) {
        console.error('Error parsing achievement notification:', error);
      }
    };

    eventSource.onerror = () => {
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        eventSource.close();
        // The useEffect will re-run and create a new connection
      }, 5000);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const removeNotification = (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 z-50 space-y-2">
      {notifications.map((notification) => (
        <AchievementPopup
          key={notification.id}
          notification={notification}
          onClose={() => removeNotification(notification.id)}
        />
      ))}
    </div>
  );
}
