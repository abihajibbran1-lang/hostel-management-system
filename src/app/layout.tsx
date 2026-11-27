import type { Metadata } from "next";
import { cookies } from "next/headers";
import Link from "next/link";
import { AUTH_COOKIE_NAME } from "../business/modules/auth/auth-cookie";
import { JwtService } from "../business/modules/auth/jwt-service";
import { SignOutButton } from "../components/auth/sign-out-button";
import "./globals.css";

export const metadata: Metadata = {
  title: "Hostel Management System",
  description: "University hostel coordination system",
};

async function getMenuRole() {
  const token = (await cookies()).get(AUTH_COOKIE_NAME)?.value;
  if (!token) return null;

  try {
    return (await new JwtService().verify(token))?.role ?? null;
  } catch {
    return null;
  }
}

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Navigation is a convenience. API middleware still checks account status and permissions.
  const role = await getMenuRole();
  return (
    <html lang="en">
      <body>
        <nav aria-label="Main navigation" className="flex flex-wrap items-center gap-4 border-b border-slate-200 px-6 py-4 text-sm">
          <Link href="/" className="font-semibold">Hostel Management System</Link>
          {role === "STUDENT" && (
            <>
              <Link href="/schedule">My Schedule</Link>
              <Link href="/complaints">My Complaints</Link>
            </>
          )}
          {role === "WARDEN" && <Link href="/warden/complaints">Complaint Queue</Link>}
          {role === "MANAGER" && <Link href="/manager/complaints">Escalated complaints</Link>}
          {(role === "STUDENT" || role === "WARDEN" || role === "MANAGER") && <Link href="/responsibilities">Shared Responsibilities</Link>}
          {role === "WARDEN" && <Link href="/warden/responsibility-assistance">Warden Assistance</Link>}
          {(role === "WARDEN" || role === "MANAGER") && <Link href="/room-management">Room Management</Link>}
          {role && <Link href="/notifications">Notifications</Link>}
          {role ? <SignOutButton /> : <Link href="/login">Sign in</Link>}
        </nav>
        {children}
      </body>
    </html>
  );
}
