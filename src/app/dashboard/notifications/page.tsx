import NotificationList from '@/app/components/NotificationList'

export default function NotificationsPage() {
    return (
        <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Notifications</h1>
            <NotificationList />
        </div>
    )
}
