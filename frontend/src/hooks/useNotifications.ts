/**
 * useNotifications Hook
 * Custom hook for managing notification-related operations
 */
import { useState, useEffect, useCallback } from "react"
import { useToast } from "../contexts/ToastContext"
import api from "../utils/api"

interface Notification {
  id: string
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  isRead: boolean
  createdAt: string
  userId: string
  assessmentId?: string
  batchId?: string
}

interface NotificationCreateData {
  title: string
  message: string
  type: "info" | "success" | "warning" | "error"
  userId?: string
  assessmentId?: string
  batchId?: string
}

interface UseNotificationsReturn {
  notifications: Notification[]
  unreadCount: number
  loading: boolean
  error: string | null
  createNotification: (data: NotificationCreateData) => Promise<Notification | null>
  markAsRead: (id: string) => Promise<boolean>
  markAllAsRead: () => Promise<boolean>
  deleteNotification: (id: string) => Promise<boolean>
  deleteAllNotifications: () => Promise<boolean>
  refreshNotifications: () => Promise<void>
}

/** Normalize a backend notification doc (snake_case / varied fields) into the frontend shape. */
const normalizeNotification = (n: any): Notification => ({
  id: String(n.id ?? n._id ?? ""),
  title: n.title ?? "Notification",
  message: n.message ?? "",
  type: (n.type ?? n.notification_type ?? "info") as Notification["type"],
  isRead: Boolean(n.isRead ?? n.is_read ?? n.read ?? false),
  createdAt: n.createdAt ?? n.created_at ?? n.timestamp ?? new Date().toISOString(),
  userId: String(n.userId ?? n.user_id ?? ""),
  assessmentId: n.assessmentId ?? n.assessment_id,
  batchId: n.batchId ?? n.batch_id,
})

export const useNotifications = (): UseNotificationsReturn => {
  const { success, error: showError } = useToast()
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await api.get("/api/notifications/")
      const data = response.data
      // Backend returns { notifications: [...], unread_count }; tolerate a bare array too
      const rawList: any[] = Array.isArray(data) ? data : (data?.notifications ?? [])
      const list = rawList.map(normalizeNotification)
      setNotifications(list)
      const serverUnread =
        !Array.isArray(data) && typeof data?.unread_count === "number" ? data.unread_count : null
      setUnreadCount(serverUnread ?? list.filter((n) => !n.isRead).length)
    } catch (err) {
      console.error("Failed to fetch notifications:", err)
      setError("Failed to fetch notifications")
      setNotifications([])
      setUnreadCount(0)
    } finally {
      setLoading(false)
    }
  }, [])

  const createNotification = useCallback(async (data: NotificationCreateData): Promise<Notification | null> => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.post("/api/notifications/", data)
      if (response.data) {
        const newNotification: Notification = {
          id: response.data.id,
          title: data.title,
          message: data.message,
          type: data.type,
          isRead: false,
          createdAt: new Date().toISOString(),
          userId: data.userId || "",
          assessmentId: data.assessmentId,
          batchId: data.batchId
        }
        setNotifications(prev => [newNotification, ...prev])
        setUnreadCount(prev => prev + 1)
        return newNotification
      }
      return null
    } catch (err) {
      console.error("Failed to create notification:", err)
      setError("Failed to create notification")
      showError("Failed to create notification")
      return null
    } finally {
      setLoading(false)
    }
  }, [success, showError])

  const markAsRead = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.post(`/api/notifications/${id}/read`)
      if (response.data) {
        setNotifications(prev => 
          prev.map(notification => 
            notification.id === id 
              ? { ...notification, isRead: true }
              : notification
          )
        )
        setUnreadCount(prev => Math.max(0, prev - 1))
        return true
      }
      return false
    } catch (err) {
      console.error("Failed to mark notification as read:", err)
      setError("Failed to mark notification as read")
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const markAllAsRead = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.post("/api/notifications/mark-all-read")
      if (response.data) {
        setNotifications(prev => 
          prev.map(notification => ({ ...notification, isRead: true }))
        )
        setUnreadCount(0)
        success("All notifications marked as read!")
        return true
      }
      return false
    } catch (err) {
      console.error("Failed to mark all notifications as read:", err)
      setError("Failed to mark all notifications as read")
      showError("Failed to mark all notifications as read")
      return false
    } finally {
      setLoading(false)
    }
  }, [success, showError])

  const deleteNotification = useCallback(async (id: string): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.delete(`/api/notifications/${id}`)
      if (response.status === 200) {
        const notification = notifications.find(n => n.id === id)
        setNotifications(prev => prev.filter(notification => notification.id !== id))
        if (notification && !notification.isRead) {
          setUnreadCount(prev => Math.max(0, prev - 1))
        }
        success("Notification deleted successfully!")
        return true
      }
      return false
    } catch (err) {
      console.error("Failed to delete notification:", err)
      setError("Failed to delete notification")
      showError("Failed to delete notification")
      return false
    } finally {
      setLoading(false)
    }
  }, [success, showError, notifications])

  const deleteAllNotifications = useCallback(async (): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await api.delete("/api/notifications/")
      if (response.status === 200) {
        setNotifications([])
        setUnreadCount(0)
        success("All notifications deleted successfully!")
        return true
      }
      return false
    } catch (err) {
      console.error("Failed to delete all notifications:", err)
      setError("Failed to delete all notifications")
      showError("Failed to delete all notifications")
      return false
    } finally {
      setLoading(false)
    }
  }, [success, showError])

  const refreshNotifications = useCallback(async () => {
    await fetchNotifications()
  }, [fetchNotifications])

  // Initial data fetch
  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  return {
    notifications,
    unreadCount,
    loading,
    error,
    createNotification,
    markAsRead,
    markAllAsRead,
    deleteNotification,
    deleteAllNotifications,
    refreshNotifications
  }
}
