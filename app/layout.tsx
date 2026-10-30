import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { isAdmin } from "@/lib/escrow";
import { currentUser } from "@/lib/supabase";
import "./globals.css";

export const metadata: Metadata = {
  title: "SwitchTix",
  description: "Safe ticket deals between people.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SwitchTix", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#120d26",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en">
      <body className={user ? "app" : "guest"}>
        <header className="topbar">
          <Link href={user ? "/deals" : "/"} className="brand">
            <img src="/logo.svg" alt="SwitchTix" />
          </Link>
          {user && (
            <form action="/auth/signout" method="post">
              <button className="linkish" type="submit">Sign out</button>
            </form>
          )}
        </header>
        <main>{children}</main>
        {user && (
          <nav className="tabbar">
            <Link href="/deals"><span aria-hidden="true">🎟️</span>Deals</Link>
            <Link href="/deals/new"><span aria-hidden="true">＋</span>Sell</Link>
            <Link href="/payouts"><span aria-hidden="true">💸</span>Payouts</Link>
            {isAdmin(user.email) && <Link href="/admin"><span aria-hidden="true">🛡️</span>Admin</Link>}
          </nav>
        )}
      </body>
    </html>
  );
}
