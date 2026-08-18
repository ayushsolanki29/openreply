import { signIn } from "@/lib/auth";
import { getCampaignTemplate } from "@/lib/templates/campaign-templates";
import { AuthError } from "next-auth";
import { redirect } from "next/navigation";

export const metadata = {
  title: "Login - OpenReply",
  description: "Sign in to manage Instagram comment-to-DM campaigns.",
};

async function loginAction(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "");
  const callbackUrl = String(formData.get("callbackUrl") ?? "/dashboard");

  try {
    await signIn("resend", {
      email,
      redirectTo: callbackUrl,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      redirect(`/login?error=1&callbackUrl=${encodeURIComponent(callbackUrl)}`);
    }
    throw error;
  }
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{
    error?: string;
    callbackUrl?: string;
    template?: string;
  }>;
}) {
  const params = await searchParams;
  const selectedTemplate = getCampaignTemplate(params.template);
  const templateCallbackUrl = selectedTemplate
    ? `/campaigns/new?template=${selectedTemplate.slug}`
    : null;
  const callbackUrl = params.callbackUrl ?? templateCallbackUrl ?? "/dashboard";

  return (
    <div className="min-h-screen flex items-center justify-center px-6">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-semibold text-foreground">
            OpenReply
          </h1>
          <p className="text-muted text-sm leading-relaxed mt-2">
            Enter your email to receive a sign-in link.
          </p>
        </div>

        <div className="panel rounded p-8 shadow-black/40">
          {selectedTemplate && (
            <div className="mb-5 border border-accent/20 bg-accent/10 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-accent">
                Template selected
              </p>
              <p className="mt-2 text-sm font-semibold text-foreground">
                {selectedTemplate.title}
              </p>
            </div>
          )}

          <form action={loginAction} className="space-y-5">
            <input type="hidden" name="callbackUrl" value={callbackUrl} />
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-foreground"
              >
                Email address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="you@example.com"
                className="w-full px-4 py-3 rounded bg-surface border border-border text-sm text-foreground placeholder:text-zinc-500 focus:border-accent/40 focus:outline-none transition-colors"
              />
            </div>

            {params.error && (
              <p className="text-red-500 text-sm">
                Something went wrong. Please try again.
              </p>
            )}

            <button
              type="submit"
              className="w-full inline-flex items-center justify-center gap-2 rounded bg-accent px-6 py-3.5 text-sm font-semibold text-white shadow-indigo-500/25 transition-all hover:shadow-indigo-500/30"
            >
              Send sign-in link
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
