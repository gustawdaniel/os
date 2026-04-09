import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	if (!session?.user?.id) throw redirect(303, '/');

	const integrations = await prisma.userIntegration.findMany({
		where: { userId: session.user.id }
	});

	return { integrations };
};

export const actions: Actions = {
	saveIntegration: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) return { success: false };

		const data = await event.request.formData();
		const provider = data.get('provider') as string;
		const apiKey = data.get('apiKey') as string;
		const externalId = data.get('externalId') as string;

		if (!provider || !apiKey) return { success: false };

		await prisma.userIntegration.upsert({
			where: { 
				userId_provider: { userId: session.user.id, provider }
			},
			update: { apiKey, externalId },
			create: { 
				userId: session.user.id, 
				provider, 
				apiKey,
				externalId
			}
		});

		return { success: true };
	},
	deleteIntegration: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) return { success: false };

		const data = await event.request.formData();
		const provider = data.get('provider') as string;

		await prisma.userIntegration.delete({
			where: { 
				userId_provider: { userId: session.user.id, provider }
			}
		});

		return { success: true };
	}
};
