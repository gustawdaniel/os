import { SvelteKitAuth } from "@auth/sveltekit"
import Google from "@auth/sveltekit/providers/google"
import { PrismaAdapter } from "@auth/prisma-adapter"
import { prisma } from "$lib/server/prisma"
import { env } from "$env/dynamic/private"

export const { handle, signIn, signOut } = SvelteKitAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId: env.GOOGLE_CLIENT_ID,
      clientSecret: env.GOOGLE_CLIENT_SECRET,
      authorization: {
        params: {
          scope: "openid profile email https://www.googleapis.com/auth/calendar.events https://www.googleapis.com/auth/calendar.readonly",
          access_type: "offline",
          prompt: "consent select_account",
        },
      },
    }),
  ],
  secret: env.AUTH_SECRET,
  trustHost: true,
  callbacks: {
    session: async ({ session, user }) => {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    signIn: async ({ account }) => {
      if (account?.provider === "google") {
        console.log(`[Auth] Sign-in for user ${account.providerAccountId}. Refresh token present: ${!!account.refresh_token}`);
        
        // Update tokens in the database
        // We only update refresh_token if it's actually provided by Google
        const updateData: any = {
          access_token: account.access_token,
          expires_at: account.expires_at,
        };
        
        if (account.refresh_token) {
          updateData.refresh_token = account.refresh_token;
        }

        await prisma.account.updateMany({
          where: {
            provider: "google",
            providerAccountId: account.providerAccountId,
          },
          data: updateData,
        });
      }
      return true;
    },
  },
})
