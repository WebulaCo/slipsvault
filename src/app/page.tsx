import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-brand-light flex flex-col">
      {/* Navbar */}
      <nav className="container mx-auto px-6 py-6 flex justify-between items-center">
        <div className="text-2xl font-bold text-brand-navy">Slips Vault</div>
        <div className="flex gap-4">
          <Link href="/login" className="text-brand-navy font-medium hover:text-brand-teal transition-colors">
            Login
          </Link>
          <Link href="/register" className="bg-brand-teal text-white px-5 py-2 rounded-full font-medium hover:bg-[#2a8c8e] transition-colors shadow-md">
            Sign Up
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <main className="flex-1 container mx-auto px-6 flex flex-col md:flex-row items-center justify-center gap-12 py-12 md:py-20">
        <div className="flex-1 text-center md:text-left space-y-6">
          <h1 className="text-4xl md:text-6xl font-bold text-brand-navy leading-tight">
            Manage Your Slips <br />
            <span className="text-brand-teal">Securely & Easily</span>
          </h1>
          <p className="text-lg text-gray-600 max-w-xl mx-auto md:mx-0">
            The professional way to track expenses, store receipts, and manage your financial records with AI-powered analysis.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center md:justify-start pt-4">
            <Link href="/register" className="bg-brand-navy text-white px-8 py-4 rounded-xl font-bold text-lg hover:bg-[#0d2e4d] transition-colors shadow-lg">
              Get Started Free
            </Link>
            <Link href="/login" className="bg-white text-brand-navy border border-gray-200 px-8 py-4 rounded-xl font-bold text-lg hover:bg-gray-50 transition-colors shadow-sm">
              Login
            </Link>
          </div>
        </div>

        <div className="flex-1 w-full max-w-lg">
          <div className="relative bg-white p-6 rounded-2xl shadow-2xl border border-gray-100 rotate-2 hover:rotate-0 transition-transform duration-500">
            <div className="absolute -top-4 -left-4 w-20 h-20 bg-brand-teal rounded-full opacity-20 blur-xl"></div>
            <div className="absolute -bottom-4 -right-4 w-20 h-20 bg-brand-navy rounded-full opacity-20 blur-xl"></div>

            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-light rounded-full flex items-center justify-center text-brand-teal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
                  </div>
                  <div>
                    <div className="font-bold text-brand-navy">Engen Garage</div>
                    <div className="text-xs text-gray-500">Fuel • Today</div>
                  </div>
                </div>
                <div className="font-bold text-brand-teal">$45.00</div>
              </div>

              <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-light rounded-full flex items-center justify-center text-brand-teal">
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"></circle><circle cx="20" cy="21" r="1"></circle><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"></path></svg>
                  </div>
                  <div>
                    <div className="font-bold text-brand-navy">Woolworths</div>
                    <div className="text-xs text-gray-500">Groceries • Yesterday</div>
                  </div>
                </div>
                <div className="font-bold text-brand-teal">$128.50</div>
              </div>

              <div className="h-32 bg-brand-light rounded-lg flex items-center justify-center border-2 border-dashed border-gray-200">
                <span className="text-gray-400 text-sm">Receipt Preview</span>
              </div>
            </div>
          </div>
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
