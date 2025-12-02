'use client'

import { useState, useEffect } from 'react'
import { getNotifications, markNotificationAsRead, clearAllNotifications, deleteNotification } from '@/app/actions'
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

    const [activeTab, setActiveTab] = useState<'unread' | 'all'>('unread')

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

    const handleDelete = async (id: string) => {
        if (confirm('Delete this notification?')) {
            await deleteNotification(id)
            setNotifications(prev => prev.filter(n => n.id !== id))
            router.refresh()
        }
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

    const filteredNotifications = activeTab === 'unread'
        ? notifications.filter(n => !n.read)
        : notifications

    const unreadCount = notifications.filter(n => !n.read).length

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex items-center justify-between border-b border-gray-100 pb-1">
                <div className="flex gap-6">
                    <button
                        onClick={() => setActiveTab('unread')}
                        className={`pb-3 text-sm font-medium relative ${activeTab === 'unread' ? 'text-brand-navy' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Unread
                        {unreadCount > 0 && (
                            <span className="ml-2 bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                                {unreadCount}
                            </span>
                        )}
                        {activeTab === 'unread' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-navy rounded-t-full" />
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('all')}
                        className={`pb-3 text-sm font-medium relative ${activeTab === 'all' ? 'text-brand-navy' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        All Notifications
                        {activeTab === 'all' && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-brand-navy rounded-t-full" />
                        )}
                    </button>
                </div>

                {unreadCount > 0 && (
                    <button onClick={handleClearAll} className="text-xs font-medium text-brand-teal hover:text-[#2a8c8e]">
                        Mark all as read
                    </button>
                )}
            </div>

            {/* List */}
            <div className="space-y-3">
                {filteredNotifications.length === 0 ? (
                    <div className="text-center py-12 px-4">
                        <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Bell className="w-8 h-8 text-gray-300" />
                        </div>
                        <h3 className="font-medium text-gray-900">No notifications</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            {activeTab === 'unread' ? "You're all caught up!" : "You don't have any notifications yet."}
                        </p>
                    </div>
                ) : (
                    filteredNotifications.map((notification) => (
                        <div
                            key={notification.id}
                            className={`p-4 rounded-xl border transition-all ${notification.read
                                    ? 'bg-gray-50 border-gray-100'
                                    : 'bg-white border-brand-teal/20 shadow-sm ring-1 ring-brand-teal/5'
                                }`}
                        >
                            <div className="flex gap-3">
                                <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${notification.read ? 'bg-gray-300' : 'bg-brand-teal'}`} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex justify-between items-start gap-2 mb-1">
                                        <h3 className={`font-semibold text-sm ${notification.read ? 'text-gray-600' : 'text-gray-900'}`}>
                                            {notification.title}
                                        </h3>
                                        <span className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                                            {new Date(notification.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                                        </span>
                                    </div>

                                    <p className={`text-sm mb-3 ${notification.read ? 'text-gray-500' : 'text-gray-700'}`}>
                                        {notification.message}
                                    </p>

                                    <div className="flex items-center gap-2">
                                        {notification.link && (
                                            <Link
                                                href={notification.link}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-colors"
                                            >
                                                <ExternalLink size={12} />
                                                View
                                            </Link>
                                        )}

                                        {!notification.read && (
                                            <button
                                                onClick={() => handleMarkAsRead(notification.id)}
                                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-teal hover:bg-brand-teal/5 transition-colors"
                                            >
                                                <Check size={12} />
                                                Mark as read
                                            </button>
                                        )}

                                        <div className="flex-1" />

                                        <button
                                            onClick={() => handleDelete(notification.id)}
                                            className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            title="Delete notification"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
