'use client'

import { useState, useEffect } from 'react'
import { getNotifications, markNotificationAsRead, clearAllNotifications } from '@/app/actions'
import { Bell, Check, Trash2, ExternalLink } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface Notification {
    id: string
    title: string
    message: string
    type: string
    read: boolean
    link: string | null
    createdAt: Date
}

export default function NotificationList() {
    const [notifications, setNotifications] = useState<Notification[]>([])
    const [loading, setLoading] = useState(true)
    const router = useRouter()

    const fetchNotifications = async () => {
        const data = await getNotifications()
        setNotifications(data)
        setLoading(false)
    }

    useEffect(() => {
        fetchNotifications()
    }, [])

    const handleMarkAsRead = async (id: string) => {
        await markNotificationAsRead(id)
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n))
        router.refresh()
    }

    const handleClearAll = async () => {
        if (confirm('Mark all notifications as read?')) {
            await clearAllNotifications()
            setNotifications(prev => prev.map(n => ({ ...n, read: true })))
            router.refresh()
        }
    }

    if (loading) {
        return <div className="flex justify-center p-8"><span className="loading loading-spinner loading-lg"></span></div>
    }

    if (notifications.length === 0) {
        return (
            <div className="text-center p-12 bg-base-100 rounded-xl border border-base-200">
                <div className="w-16 h-16 bg-base-200 rounded-full flex items-center justify-center mx-auto mb-4">
                    <Bell className="w-8 h-8 text-base-content/30" />
                </div>
                <h3 className="font-bold text-lg">No notifications</h3>
                <p className="text-base-content/60">You're all caught up!</p>
            </div>
        )
    }

    return (
        <div className="space-y-4">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">Notifications</h2>
                {notifications.some(n => !n.read) && (
                    <button onClick={handleClearAll} className="btn btn-sm btn-ghost text-primary">
                        Mark all as read
                    </button>
                )}
            </div>

            <div className="space-y-2">
                {notifications.map((notification) => (
                    <div
                        key={notification.id}
                        className={`p-4 rounded-lg border transition-all ${notification.read ? 'bg-base-100 border-base-200 opacity-70' : 'bg-white border-primary/20 shadow-sm'}`}
                    >
                        <div className="flex gap-4">
                            <div className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${notification.read ? 'bg-base-300' : 'bg-primary'}`} />
                            <div className="flex-1">
                                <div className="flex justify-between items-start gap-2">
                                    <h3 className={`font-bold ${notification.read ? 'text-base-content/70' : 'text-base-content'}`}>
                                        {notification.title}
                                    </h3>
                                    <span className="text-xs text-base-content/50 whitespace-nowrap">
                                        {new Date(notification.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <p className="text-sm mt-1 text-base-content/80">{notification.message}</p>

                                <div className="flex gap-2 mt-3">
                                    {notification.link && (
                                        <Link href={notification.link} className="btn btn-xs btn-outline gap-1">
                                            <ExternalLink size={12} />
                                            View
                                        </Link>
                                    )}
                                    {!notification.read && (
                                        <button
                                            onClick={() => handleMarkAsRead(notification.id)}
                                            className="btn btn-xs btn-ghost gap-1"
                                        >
                                            <Check size={12} />
                                            Mark as read
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    )
}
