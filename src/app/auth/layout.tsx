import type { Metadata } from "next";
import "../globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/ThemeProvider";
import { Sidebar } from "@/components/layout/Sidebar";
import { Header } from "@/components/layout/Header";
import { NextAuthProvider } from "@/components/NextAuthProvider";


export const metadata: Metadata = {
    title: {
        template: '%s - SIGALIX LABS',
        default: 'SIGALIX LABS',
    },
    description: "Financial essentials, nothing more.",
    icons: [
        {
            rel: "icon",
            url: "/favicon.ico"
        },
        {
            rel: "apple-touch-icon",
            url: "/apple-icon.png"
        },
        {
            rel: "manifest",
            url: "/site.webmanifest"
        },
    ],
    openGraph: {
        images: 'https://summit.kugie.dev/og-image.png',
    },
    twitter: {
        card: 'summary_large_image',
        title: 'SIGALIX LABS',
        description: 'Financial essentials, nothing more.',
        creator: 'SIGALIX LABS',
        images: ['https://summit.kugie.dev/og-image.png'],
    },
}

export default function Layout({ children }: { children: React.ReactNode }) {
    return (
        <NextAuthProvider>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                <div className="flex min-h-screen flex-col">
                    <main className="flex-1">
                        {children}
                    </main>
                </div>
                <Toaster />
            </ThemeProvider>
        </NextAuthProvider>
    )
}
