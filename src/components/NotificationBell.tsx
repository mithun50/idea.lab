"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useNotifications } from "@/hooks/useNotifications";
import { AppNotification } from "@/lib/types";
import { Bell, Mail, UserPlus, CheckCircle, XCircle, UserMinus } from "lucide-react";

function getTimeAgo(date: Date | null): string {
  if (!date) return "";
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

function getNotifIcon(type: AppNotification["type"]) {
  const size = { width: 14, height: 14 };
  switch (type) {
    case "invite_received":
      return <Mail style={{ ...size, color: "#E8341A" }} />;
    case "request_received":
      return <UserPlus style={{ ...size, color: "#2563eb" }} />;
    case "invite_accepted":
    case "request_approved":
      return <CheckCircle style={{ ...size, color: "#10b981" }} />;
    case "invite_rejected":
    case "request_rejected":
      return <XCircle style={{ ...size, color: "#E8341A" }} />;
    case "kicked_from_team":
      return <UserMinus style={{ ...size, color: "#E8341A" }} />;
    default:
      return <Bell style={{ ...size, color: "var(--muted)" }} />;
  }
}

export default function NotificationBell({ userId }: { userId: string | null }) {
  const { notifications, unreadCount, newNotification, clearNewNotification, markAsRead, markAllAsRead } = useNotifications(userId);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<AppNotification | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Show toast for new notifications
  useEffect(() => {
    if (newNotification) {
      setToast(newNotification);
      clearNewNotification();
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [newNotification, clearNewNotification]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (!userId) return null;

  const handleNotifClick = (notif: AppNotification) => {
    if (!notif.read) markAsRead(notif.id);
    setOpen(false);
    router.push(notif.linkUrl);
  };

  return (
    <>
      {/* Bell icon with badge */}
      <div ref={dropdownRef} style={{ position: "relative" }}>
        <button
          onClick={() => setOpen(!open)}
          style={{
            background: "none", border: "none", cursor: "pointer",
            position: "relative", padding: "6px",
            display: "flex", alignItems: "center", justifyContent: "center",
          }}
          aria-label="Notifications"
        >
          <Bell style={{ width: 18, height: 18, color: "var(--muted)" }} />
          {unreadCount > 0 && (
            <span style={{
              position: "absolute", top: 2, right: 2,
              width: 16, height: 16, borderRadius: "50%",
              background: "#E8341A", color: "#fff",
              fontSize: "9px", fontWeight: 700,
              display: "flex", alignItems: "center", justifyContent: "center",
              lineHeight: 1,
            }}>
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div style={{
            position: "absolute", top: "calc(100% + 8px)", right: 0,
            width: 340, maxHeight: 420, overflowY: "auto",
            background: "var(--paper)", border: "1.5px solid var(--line)",
            borderRadius: "6px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            zIndex: 200,
          }}>
            {/* Header */}
            <div style={{
              padding: "12px 16px",
              borderBottom: "1px solid var(--line)",
              display: "flex", justifyContent: "space-between", alignItems: "center",
            }}>
              <span style={{
                fontSize: "10px", fontWeight: 700,
                textTransform: "uppercase", letterSpacing: "0.12em",
                color: "var(--ink)",
              }}>
                Notifications
              </span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  style={{
                    background: "none", border: "none", cursor: "pointer",
                    fontSize: "10px", fontWeight: 600, color: "#E8341A",
                  }}
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* Notification list */}
            {notifications.length === 0 ? (
              <div style={{ padding: "32px 16px", textAlign: "center" }}>
                <p style={{ fontSize: "12px", color: "var(--muted)" }}>No notifications yet</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <button
                  key={notif.id}
                  onClick={() => handleNotifClick(notif)}
                  style={{
                    width: "100%", textAlign: "left", cursor: "pointer",
                    background: notif.read ? "transparent" : "rgba(232, 52, 26, 0.03)",
                    border: "none", borderBottom: "1px solid var(--line)",
                    padding: "12px 16px",
                    display: "flex", gap: "10px", alignItems: "flex-start",
                    transition: "background 0.15s",
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = "var(--paper2)")}
                  onMouseLeave={(e) => (e.currentTarget.style.background = notif.read ? "transparent" : "rgba(232, 52, 26, 0.03)")}
                >
                  <div style={{ flexShrink: 0, marginTop: 2 }}>
                    {getNotifIcon(notif.type)}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{
                      fontSize: "12px", fontWeight: notif.read ? 500 : 700,
                      color: "var(--ink)", lineHeight: 1.3,
                      whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                    }}>
                      {notif.title}
                    </p>
                    <p style={{
                      fontSize: "11px", color: "var(--muted)", marginTop: "2px",
                      lineHeight: 1.4,
                      display: "-webkit-box", WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical", overflow: "hidden",
                    }}>
                      {notif.message}
                    </p>
                    <p style={{ fontSize: "10px", color: "#aaa", marginTop: "4px" }}>
                      {getTimeAgo(notif.createdAt)}
                    </p>
                  </div>
                  {!notif.read && (
                    <div style={{
                      width: 7, height: 7, borderRadius: "50%",
                      background: "#E8341A", flexShrink: 0, marginTop: 4,
                    }} />
                  )}
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Toast popup for new notification */}
      {toast && (
        <div
          onClick={() => {
            setToast(null);
            router.push(toast.linkUrl);
          }}
          style={{
            position: "fixed", bottom: 24, right: 24,
            width: 320, padding: "14px 18px",
            background: "var(--ink)", color: "var(--paper)",
            borderRadius: "6px", cursor: "pointer",
            boxShadow: "0 8px 32px rgba(0,0,0,0.25)",
            zIndex: 10000,
            display: "flex", gap: "10px", alignItems: "flex-start",
            animation: "slideUp 0.3s ease-out",
          }}
        >
          <Bell style={{ width: 16, height: 16, flexShrink: 0, marginTop: 1, color: "var(--paper)" }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: "12px", fontWeight: 700, lineHeight: 1.3 }}>
              {toast.title}
            </p>
            <p style={{ fontSize: "11px", opacity: 0.7, marginTop: "2px", lineHeight: 1.3 }}>
              {toast.message}
            </p>
          </div>
        </div>
      )}
    </>
  );
}
