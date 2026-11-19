import Link from "next/link";
import { Music2 } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex h-[70vh] flex-col items-center justify-center gap-4 px-6 text-center">
      <Music2 size={56} className="text-accent" />
      <h1 className="text-4xl font-black">Page not found</h1>
      <p className="max-w-sm text-text-dim">The page you&rsquo;re looking for doesn&rsquo;t exist or was moved.</p>
      <Link href="/" className="mt-2 rounded-full bg-accent px-6 py-2.5 text-sm font-bold text-black hover:bg-accent-bright">
        Back to Home
      </Link>
    </div>
  );
}
