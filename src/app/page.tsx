import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await getServerSession(authOptions);

  if (session) {
    redirect("/dashboard/create");
  }

  return (
    <div className="container min-h-screen flex flex-col items-center justify-center text-center px-4">
      <h1 className="text-5xl md:text-6xl font-bold mb-4 bg-gradient-to-r from-primary to-ring bg-clip-text text-transparent">
        Slips Vault
      </h1>
      <p className="text-xl text-muted-foreground max-w-xl mb-8">
        Securely manage your slips, receipts, and important records with photo attachments.
      </p>

      <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
        <Link href="/login" className="btn btn-primary text-base px-8 py-3 w-full sm:w-auto">
          Log In
        </Link>
        <Link href="/register" className="btn btn-secondary text-base px-8 py-3 w-full sm:w-auto">
          Create Account
        </Link>
      </div>
    </div>
  );
}
