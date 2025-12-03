import Link from "next/link";
import Logo from "@/app/components/Logo";

export default function PrivacyPolicy() {
    return (
        <div className="min-h-screen bg-white flex flex-col">
            <nav className="container mx-auto px-6 py-6 flex justify-between items-center border-b border-gray-100">
                <Logo showText={true} size={32} />
                <Link href="/" className="text-sm font-medium text-gray-600 hover:text-brand-navy">
                    Back to Home
                </Link>
            </nav>

            <main className="flex-1 container mx-auto px-6 py-12 max-w-4xl">
                <h1 className="text-3xl font-bold text-brand-navy mb-8">Privacy Policy</h1>

                <div className="prose prose-slate max-w-none">
                    <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-brand-navy mb-4">1. Introduction</h2>
                        <p className="text-gray-600 mb-4">
                            Welcome to Slips Vault ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data.
                            This privacy policy will inform you as to how we look after your personal data when you visit our website and tell you
                            about your privacy rights and how the law protects you.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-brand-navy mb-4">2. Data We Collect</h2>
                        <p className="text-gray-600 mb-4">
                            We may collect, use, store and transfer different kinds of personal data about you which we have grouped together follows:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-600">
                            <li><strong>Identity Data:</strong> includes first name, last name, username or similar identifier.</li>
                            <li><strong>Contact Data:</strong> includes email address.</li>
                            <li><strong>Financial Data:</strong> includes transaction data extracted from your uploaded slips/receipts.</li>
                            <li><strong>Technical Data:</strong> includes internet protocol (IP) address, your login data, browser type and version, time zone setting and location, browser plug-in types and versions, operating system and platform and other technology on the devices you use to access this website.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-brand-navy mb-4">3. How We Use Your Data</h2>
                        <p className="text-gray-600 mb-4">
                            We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:
                        </p>
                        <ul className="list-disc pl-6 space-y-2 text-gray-600">
                            <li>To register you as a new customer.</li>
                            <li>To provide the service of processing and storing your financial slips.</li>
                            <li>To manage our relationship with you.</li>
                            <li>To improve our website, products/services, marketing or customer relationships.</li>
                        </ul>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-brand-navy mb-4">4. Data Security</h2>
                        <p className="text-gray-600 mb-4">
                            We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used or accessed in an unauthorized way, altered or disclosed. In addition, we limit access to your personal data to those employees, agents, contractors and other third parties who have a business need to know.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-brand-navy mb-4">5. Your Legal Rights</h2>
                        <p className="text-gray-600 mb-4">
                            Under certain circumstances, you have rights under data protection laws in relation to your personal data, including the right to request access, correction, erasure, restriction, transfer, or to object to processing.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-brand-navy mb-4">6. Contact Us</h2>
                        <p className="text-gray-600 mb-4">
                            If you have any questions about this privacy policy or our privacy practices, please contact us at support@slipsvault.com.
                        </p>
                    </section>
                </div>
            </main>

            <footer className="bg-white border-t border-gray-100 py-8">
                <div className="container mx-auto px-6 text-center text-gray-500 text-sm">
                    &copy; {new Date().getFullYear()} Slips Vault. All rights reserved.
                </div>
            </footer>
        </div>
    );
}
