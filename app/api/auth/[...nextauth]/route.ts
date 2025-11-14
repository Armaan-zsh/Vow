// @ts-nocheck
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';
import AppleProvider from 'next-auth/providers/apple';
import EmailProvider from 'next-auth/providers/email';
import CredentialsProvider from 'next-auth/providers/credentials';
import { PrismaAdapter } from '@auth/prisma-adapter';
import { PrismaClient } from '@prisma/client';
import { createUserId } from '../../../../src/core/entities/User';
import { generateUsername } from '../../../../src/shared/utils/username';
import { verifyPhoneOTP } from '../../../phone/verify/route';

const prisma = new PrismaClient();

const authOptions = {
  adapter: PrismaAdapter(prisma),
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          scope: 'openid email profile',
          prompt: 'consent',
          access_type: 'offline',
          response_type: 'code'
        }
      }
    }),
    
    AppleProvider({
      clientId: process.env.APPLE_CLIENT_ID!,
      clientSecret: process.env.APPLE_PRIVATE_KEY!,
      authorization: {
        params: {
          scope: 'name email',
          response_mode: 'form_post'
        }
      }
    }),
    
    EmailProvider({
      server: {
        host: process.env.EMAIL_SERVER_HOST,
        port: process.env.EMAIL_SERVER_PORT,
        auth: {
          user: process.env.EMAIL_SERVER_USER,
          pass: process.env.EMAIL_SERVER_PASSWORD
        }
      },
      from: process.env.EMAIL_FROM,
      maxAge: 10 * 60 // 10 minutes
    }),
    
    CredentialsProvider({
      id: 'phone',
      name: 'Phone',
      credentials: {
        phone: { label: 'Phone', type: 'text' },
        code: { label: 'Code', type: 'text' }
      },
      async authorize(credentials) {
        if (!credentials?.phone || !credentials?.code) {
          return null;
        }

        try {
          const isValid = await verifyPhoneOTP(credentials.phone, credentials.code);
          
          if (!isValid) {
            return null;
          }

          // Find or create user with phone
          let user = await prisma.user.findUnique({
            where: { phone: credentials.phone }
          });

          if (!user) {
            const username = await generateUsername(credentials.phone);
            user = await prisma.user.create({
              data: {
                phone: credentials.phone,
                username,
                name: `User ${credentials.phone.slice(-4)}`,
                isVerified: true
              }
            });
          }

          return {
            id: user.id,
            name: user.name,
            email: user.email,
            phone: user.phone,
            username: user.username
          };
        } catch (error) {
          console.error('Phone auth error:', error);
          return null;
        }
      }
    })
  ],

  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
    newUser: '/onboarding'
  },

  callbacks: {
    async signIn({ user, account, profile }) {
      try {
        // Rate limiting check
        const rateLimitKey = `signin:${user.email || user.phone}`;
        // Implementation would check Redis rate limit here
        
        // Handle Apple private email relay
        if (account?.provider === 'apple' && profile?.email?.includes('@privaterelay.appleid.com')) {
          // Store the private relay email but mark as private
          user.email = profile.email;
          user.isPrivateEmail = true;
        }

        // Generate username for new users
        if (!user.username) {
          const baseUsername = user.email?.split('@')[0] || user.phone || user.name;
          user.username = await generateUsername(baseUsername);
        }

        return true;
      } catch (error) {
        console.error('SignIn callback error:', error);
        return false;
      }
    },

    async jwt({ token, user, account }) {
      // Include userId in token for API routes
      if (user) {
        token.userId = createUserId(user.id);
        token.username = user.username;
        token.isNewUser = !user.createdAt || 
          (new Date().getTime() - new Date(user.createdAt).getTime()) < 60000; // 1 minute
      }

      return token;
    },

    async session({ session, token }) {
      // Enrich session with user data
      if (token.userId) {
        const user = await prisma.user.findUnique({
          where: { id: token.userId },
          include: {
            interests: true,
            _count: {
              select: {
                items: true,
                followers: true,
                following: true
              }
            }
          }
        });

        if (user) {
          session.user.id = token.userId;
          session.user.username = user.username;
          session.user.interests = user.interests;
          session.user.stats = {
            totalItems: user._count.items,
            followers: user._count.followers,
            following: user._count.following,
            readingStreak: user.readingStreak,
            totalItemsRead: user.totalItemsRead
          };
          session.user.isNewUser = token.isNewUser;
        }
      }

      return session;
    },

    async redirect({ url, baseUrl }) {
      // Handle first-time user onboarding redirect
      if (url.includes('newUser=true')) {
        return `${baseUrl}/onboarding`;
      }
      
      // Redirect to dashboard after successful sign in
      if (url === baseUrl) {
        return `${baseUrl}/dashboard`;
      }
      
      return url.startsWith(baseUrl) ? url : baseUrl;
    }
  },

  events: {
    async signIn({ user, account, isNewUser }) {
      if (isNewUser) {
        // Track new user registration
        console.log('New user registered:', { userId: user.id, provider: account?.provider });
        
        // Could emit event for welcome email, analytics, etc.
      }
    },

    async signOut({ token }) {
      // Clean up any user-specific cache
      console.log('User signed out:', { userId: token?.userId });
    }
  },

  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
    updateAge: 24 * 60 * 60 // 24 hours
  },

  jwt: {
    maxAge: 30 * 24 * 60 * 60 // 30 days
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };