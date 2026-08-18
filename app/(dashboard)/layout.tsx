import { redirect } from "next/navigation";
import DashboardShell from "@/components/dashboard-shell";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/client";
import { ensureWorkspaceForUser } from "@/lib/workspace";

// All dashboard pages are user-specific — never statically prerender them.
export const dynamic = "force-dynamic";

const BYPASS_AUTH = process.env.BYPASS_AUTH === "true";
const BYPASS_EMAIL = process.env.BYPASS_AUTH_EMAIL ?? "admin@localhost";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let userId: string;
  let userEmail: string | null | undefined;

  if (BYPASS_AUTH) {
    // Auth is temporarily disabled — resolve or create the bypass user directly
    let user = await prisma.user.findUnique({ where: { email: BYPASS_EMAIL } });
    if (!user) {
      user = await prisma.user.create({
        data: { email: BYPASS_EMAIL, name: "Admin" },
      });
    }
    userId = user.id;
    userEmail = user.email;
  } else {
    const session = await auth();
    if (!session?.user?.id) {
      redirect("/login");
    }
    userId = session.user.id;
    userEmail = session.user.email;
  }

  let workspace;
  try {
    workspace = await ensureWorkspaceForUser(userId, userEmail);
  } catch {
    redirect("/login");
  }

  const accounts = await prisma.instagramAccount.findMany({
    where: { workspaceId: workspace.id },
    orderBy: { connectedAt: "desc" },
    select: { username: true },
  });

  return (
    <DashboardShell
      workspaceName={workspace.name}
      instagramUsername={accounts[0]?.username ?? null}
      instagramAccountCount={accounts.length}
    >
      {children}
    </DashboardShell>
  );
}
