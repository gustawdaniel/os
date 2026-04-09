import { prisma } from './prisma';
import { env } from '$env/dynamic/private';

export async function getGoogleAccessToken(userId: string, fetcher = fetch) {
	const account = await prisma.account.findFirst({
		where: { userId, provider: 'google' }
	});

	if (!account) {
		console.warn(`[Google] No Google account found for user ${userId}`);
		return null;
	}

	// Check if token is expired or about to expire (within 5 minutes)
	const now = Math.floor(Date.now() / 1000);
	if (account.access_token && account.expires_at && account.expires_at > now + 300) {
		console.log(`[Google] Using existing access token for user ${userId}. Expires in ${account.expires_at - now}s`);
		return account.access_token;
	}

	// Token expired or missing, refresh it
	if (!account.refresh_token) {
		console.error(`[Google] NO REFRESH TOKEN for user ${userId}. Access token is ${account.access_token ? 'expired' : 'missing'}.`);
		console.error(`[Google] Action required: User needs to logout and login again (with consent).`);
		return account.access_token; // Fallback to current token, though it likely won't work
	}

	console.log(`[Google] Refreshing token for user ${userId}...`);
	try {
		const response = await fetcher('https://oauth2.googleapis.com/token', {
			method: 'POST',
			headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
			body: new URLSearchParams({
				client_id: env.GOOGLE_CLIENT_ID,
				client_secret: env.GOOGLE_CLIENT_SECRET,
				grant_type: 'refresh_token',
				refresh_token: account.refresh_token
			})
		});

		const tokens = await response.json();

		if (!response.ok) {
			console.error('Failed to refresh Google token:', tokens);
			return null;
		}

		// Update database
		await prisma.account.update({
			where: { id: account.id },
			data: {
				access_token: tokens.access_token,
				expires_at: Math.floor(Date.now() / 1000 + tokens.expires_in),
				refresh_token: tokens.refresh_token ?? account.refresh_token // Sometimes Google doesn't return a new refresh token
			}
		});

		return tokens.access_token;
	} catch (error) {
		console.error('Error refreshing Google token:', error);
		return null;
	}
}
