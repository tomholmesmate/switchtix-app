import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { currentUser } from "@/lib/supabase";
import "./globals.css";

export const metadata: Metadata = {
  title: "SwitchTix",
  description: "Safe deals. Forever stubs.",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "SwitchTix", statusBarStyle: "black-translucent" },
  icons: { icon: "/icon-192.png", apple: "/icon-192.png" },
};

export const viewport: Viewport = {
  themeColor: "#0d0b1a",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const user = await currentUser();
  return (
    <html lang="en">
      <body>
        <header className="topbar">
          <Link href={user ? "/collection" : "/"} className="brand">
            Switch<span>Tix</span>
          </Link>
          {user && (
            <nav>
              <Link href="/collection">Stubs</Link>
              <Link href="/deals">Deals</Link>
              <form action="/auth/signout" method="post">
                <button className="linkish" type="submit">Sign out</button>
              </form>
            </nav>
          )}
        </header>
        <main>{children}</main>
        <footer className="foot">Beta for friends and family · test network only, nothing here has cash value</footer>
      </body>
    </html>
  );
}
