import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { cn } from "@/app/lib/utils";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI選挙アドバイザー",
  description: "あなたの価値観に合った投票先をAIがアドバイスします",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body className={cn(inter.className, "bg-slate-50 text-slate-900 antialiased min-h-screen")}>
        <header className="sticky top-0 z-50 w-full border-b bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
          <div className="container flex h-14 items-center pl-4 pr-4">
            <div className="mr-4 md:flex">
              <a className="mr-6 flex items-center space-x-2" href="/">
                <span className="hidden font-bold sm:inline-block">AI選挙アドバイザー</span>
              </a>
            </div>
          </div>
        </header>
        <main className="flex-1 container mx-auto p-4 md:p-8 max-w-4xl">
          {children}
        </main>
      </body>
    </html>
  );
}
