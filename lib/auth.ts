import NextAuth, { type NextAuthConfig } from "next-auth";
import Resend from "next-auth/providers/resend";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/db/client";
import { ensureWorkspaceForUser, getPrimaryWorkspace } from "@/lib/workspace";

type AdapterPrismaClient = Parameters<typeof PrismaAdapter>[0];

// ---------------------------------------------------------------------------
// TEMPORARY: Auth is disabled. All requests are treated as the bypass user.
// Remove this block and restore the real config when auth is re-enabled.
// ---------------------------------------------------------------------------
const BYPASS_AUTH = process.env.BYPASS_AUTH === "true";
const BYPASS_EMAIL = process.env.BYPASS_AUTH_EMAIL ?? "admin@localhost";

export const authConfig = {
  adapter: PrismaAdapter(prisma as unknown as AdapterPrismaClient),
  providers: [
    Resend({
      apiKey: process.env.RESEND_API_KEY,
      from: process.env.EMAIL_FROM ?? "OpenReply <no-reply@openreply.app>",
    }),
  ],
  callbacks: {
    async session({ session, user }) {
      if (user) {
        session.user.id = user.id;
        await ensureWorkspaceForUser(user.id, user.email);
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
    verifyRequest: "/verify-request",
  },
  session: {
    strategy: "database",
    maxAge: 30 * 24 * 60 * 60,
  },
  trustHost: true,
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);

async function getOrCreateBypassUser(): Promise<string> {
  let user = await prisma.user.findUnique({ where: { email: BYPASS_EMAIL } });
  if (!user) {
    user = await prisma.user.create({
      data: { email: BYPASS_EMAIL, name: "Admin" },
    });
  }
  await ensureWorkspaceForUser(user.id, user.email);
  return user.id;
}

export async function getCurrentUserId(): Promise<string | null> {
  if (BYPASS_AUTH) return getOrCreateBypassUser();
  const session = await auth();
  return session?.user?.id ?? null;
}

export async function getCurrentWorkspaceId(): Promise<string | null> {
  const userId = await getCurrentUserId();
  if (!userId) return null;

  const workspace = await getPrimaryWorkspace(userId);
  if (workspace) return workspace.id;

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true },
  });

  const createdWorkspace = await ensureWorkspaceForUser(userId, user?.email);
  return createdWorkspace.id;
}
