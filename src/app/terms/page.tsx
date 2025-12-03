import Link from "next/link";
import Logo from "@/app/components/Logo";

export default function TermsOfService() {
    return (
        <div className="min-h-screen bg-white flex flex-col">
            <nav className="container mx-auto px-6 py-6 flex justify-between items-center border-b border-gray-100">
                <Logo showText={true} size={32} />
                <Link href="/" className="text-sm font-medium text-gray-600 hover:text-brand-navy">
                    Back to Home
                </Link>
            </nav>

            <main className="flex-1 container mx-auto px-6 py-12 max-w-4xl">
                <h1 className="text-3xl font-bold text-brand-navy mb-8">Terms of Service</h1>

                <div className="prose prose-slate max-w-none">
                    <p className="text-gray-600 mb-6">Last updated: {new Date().toLocaleDateString()}</p>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-brand-navy mb-4">1. Agreement to Terms</h2>
                        <p className="text-gray-600 mb-4">
                            By accessing or using Slips Vault, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, you may not access or use the service.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-brand-navy mb-4">2. Description of Service</h2>
                        <p className="text-gray-600 mb-4">
                            Slips Vault provides a platform for users to upload, store, and manage financial slips and receipts. We use AI technology to extract data from these documents. While we strive for accuracy, we cannot guarantee 100% accuracy of the data extraction.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-brand-navy mb-4">3. User Accounts</h2>
                        <p className="text-gray-600 mb-4">
                            When you create an account with us, you must provide information that is accurate, complete, and current at all times. Failure to do so constitutes a breach of the Terms, which may result in immediate termination of your account on our Service.
                        </p>
                        <p className="text-gray-600 mb-4">
                            You are responsible for safeguarding the password that you use to access the Service and for any activities or actions under your password.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-brand-navy mb-4">4. Content</h2>
                        <p className="text-gray-600 mb-4">
                            Our Service allows you to post, link, store, share and otherwise make available certain information, text, graphics, videos, or other material ("Content"). You are responsible for the Content that you post to the Service, including its legality, reliability, and appropriateness.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-brand-navy mb-4">5. Termination</h2>
                        <p className="text-gray-600 mb-4">
                            We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms. Upon termination, your right to use the Service will immediately cease.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-brand-navy mb-4">6. Limitation of Liability</h2>
                        <p className="text-gray-600 mb-4">
                            In no event shall Slips Vault, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any indirect, incidental, special, consequential or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your access to or use of or inability to access or use the Service.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-brand-navy mb-4">7. Changes</h2>
                        <p className="text-gray-600 mb-4">
                            We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material we will try to provide at least 30 days notice prior to any new terms taking effect. What constitutes a material change will be determined at our sole discretion.
                        </p>
                    </section>

                    <section className="mb-8">
                        <h2 className="text-xl font-bold text-brand-navy mb-4">8. Contact Us</h2>
                        <p className="text-gray-600 mb-4">
                            If you have any questions about these Terms, please contact us at support@slipsvault.com.
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
