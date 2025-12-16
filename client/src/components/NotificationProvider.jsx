import React, { createContext, useContext, useState, useCallback } from "react";
import { CheckCircle, AlertCircle, Info, X } from "lucide-react";

const NotificationContext = createContext();

export function useNotification() {
  return useContext(NotificationContext);
}

export function NotificationProvider({ children }) {
  const [notification, setNotification] = useState(null);
  const [type, setType] = useState("info");

  const showNotification = useCallback((message, type = "info") => {
    setNotification(message);
    setType(type);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  const getStyles = () => {
    switch (type) {
      case "success":
        return {
          icon: <CheckCircle className="text-green-400" size={24} />,
          border: "border-green-500/20",
          glow: "shadow-green-500/10"
        };
      case "error":
        return {
          icon: <AlertCircle className="text-red-400" size={24} />,
          border: "border-red-500/20",
          glow: "shadow-red-500/10"
        };
      default:
        return {
          icon: <Info className="text-blue-400" size={24} />,
          border: "border-blue-500/20",
          glow: "shadow-blue-500/10"
        };
    }
  };

  const styles = getStyles();

  return (
    <NotificationContext.Provider value={{ showNotification }}>
      {children}
      {notification && (
        <div
          className={`
            fixed top-24 right-6 z-[100] 
            flex items-center gap-4 px-6 py-4 
            bg-black/80 backdrop-blur-xl 
            border ${styles.border} rounded-2xl 
            shadow-2xl ${styles.glow}
            text-white transform transition-all duration-300 
            animate-in slide-in-from-right-10 fade-in
          `}
        >
          <div className="shrink-0">
            {styles.icon}
          </div>
          <div className="flex-1 mr-4">
            <p className="font-medium text-sm text-gray-100">{notification}</p>
          </div>
          <button 
            onClick={() => setNotification(null)}
            className="text-gray-500 hover:text-white transition-colors"
          >
            <X size={16} />
          </button>
        </div>
      )}
    </NotificationContext.Provider>
  );
}