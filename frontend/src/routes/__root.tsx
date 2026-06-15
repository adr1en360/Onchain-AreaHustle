import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Outlet, Link, createRootRouteWithContext, useRouter, HeadContent, Scripts } from "@tanstack/react-router";
import { useEffect, type ReactNode } from "react";

import appCss from "../styles.css?url";
import { AuthProvider } from "@/lib/auth-context";
import { CeloProvider } from "@/components/CeloProvider";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { VoiceTerminal } from "@/components/VoiceTerminal";
import { PageLoader } from "@/components/PageLoader";
import { Toaster } from "@/components/ui/sonner";

function NotFoundComponent() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="font-display text-7xl font-bold text-foreground">404</h1>
        <h2 className="mt-4 text-xl font-semibold">Page not found</h2>
        <p className="mt-2 text-sm text-muted-foreground">The page you're looking for doesn't exist or has been moved.</p>
        <div className="mt-6">
          <Link
            to="/"
            className="inline-flex items-center justify-center rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Go home
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorComponent({ error, reset }: { error: Error; reset: () => void }) {
  console.error(error);
  const router = useRouter();

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-semibold">This page didn't load</h1>
        <p className="mt-2 text-sm text-muted-foreground">Something went wrong. Try again or go home.</p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <button
            onClick={() => {
              router.invalidate();
              reset();
            }}
            className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"
          >
            Try again
          </button>
          <a href="/" className="rounded-full border px-5 py-2.5 text-sm font-medium">
            Go home
          </a>
        </div>
      </div>
    </div>
  );
}

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  head: () => ({
    meta: [
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
      { title: "Onchain AreaHustle - Your Celo Financial Passport Assistant" },
      { name: "title", content: "Onchain AreaHustle - Your Celo Financial Passport Assistant" },
      {
        name: "description",
        content: "Onchain AreaHustle provides a smart Financial Passport Assistant on Celo to help you manage your hustles and finances effectively.",
      },
      { name: "keywords", content: "finance, hustle, financial passport, assistant, areahustle, celo, onchain, wealth management" },
      { name: "author", content: "AreaHustle Team" },
      { name: "robots", content: "index, follow" },
      { name: "theme-color", content: "#ffffff" },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://areahustle.com/" },
      { property: "og:title", content: "Onchain AreaHustle - Your Celo Financial Passport Assistant" },
      {
        property: "og:description",
        content: "Onchain AreaHustle provides a smart Financial Passport Assistant on Celo to help you manage your hustles and finances effectively.",
      },
      { property: "og:image", content: "https://areahustle.com/banner-image.png" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:url", content: "https://areahustle.com/" },
      { name: "twitter:title", content: "Onchain AreaHustle - Your Celo Financial Passport Assistant" },
      {
        name: "twitter:description",
        content: "Onchain AreaHustle provides a smart Financial Passport Assistant on Celo to help you manage your hustles and finances effectively.",
      },
      { name: "twitter:image", content: "https://areahustle.com/banner-image.png" },
    ],
    links: [
      { rel: "icon", href: "/favicon.png" },
      { rel: "canonical", href: "https://areahustle.com/" },
      { rel: "stylesheet", href: appCss },
      { rel: "preconnect", href: "https://fonts.googleapis.com" },
      { rel: "preconnect", href: "https://fonts.gstatic.com", crossOrigin: "anonymous" },
      {
        rel: "stylesheet",
        href: "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,600;12..96,700;12..96,800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap",
      },
    ],
  }),
  shellComponent: RootShell,
  component: RootComponent,
  notFoundComponent: NotFoundComponent,
  errorComponent: ErrorComponent,
});

function RootShell({ children }: { children: ReactNode }) {
  return (
    <>
      <HeadContent />
      {children}
      <Scripts />
    </>
  );
}

function RootComponent() {
  const { queryClient } = Route.useRouteContext();
  const router = useRouter();
  const isPitch = router.state.location.pathname.startsWith("/pitch");

  return (
    <QueryClientProvider client={queryClient}>
      <CeloProvider>
        <AuthProvider>
          {isPitch ? (
            /* Pitch deck: full-screen immersive, no app chrome */
            <Outlet />
          ) : (
            <>
              <PageLoader />
              <Navbar />
              <main className="min-h-[calc(100vh-4rem)]">
                <Outlet />
              </main>
              <Footer />
              {/* <VoiceTerminal /> */}
              <Toaster position="top-right" richColors />
            </>
          )}
        </AuthProvider>
      </CeloProvider>

    </QueryClientProvider>
  );
}
