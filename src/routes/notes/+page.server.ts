import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	if (!session?.user?.id) throw redirect(303, '/');

	const notes = await prisma.note.findMany({
		where: { userId: session.user.id },
		orderBy: { order: 'asc' }
	});

	return {
		notes,
		user: session.user
	};
};

export const actions: Actions = {
	createNote: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) return { success: false };

		const data = await event.request.formData();
		const title = (data.get('title') as string) || 'Nowa notatka';

		// Pobierz ostatni order
		const lastNote = await prisma.note.findFirst({
			where: { userId: session.user.id },
			orderBy: { order: 'desc' }
		});

		const newOrder = lastNote ? lastNote.order + 1 : 0;

		const note = await prisma.note.create({
			data: {
				userId: session.user.id,
				title,
				content: '',
				order: newOrder
			}
		});

		return { success: true, note };
	},

	updateNote: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user) return { success: false };

		const data = await event.request.formData();
		const id = data.get('id') as string;
		const title = data.get('title') as string;
		const content = data.get('content') as string;

		if (!id) return { success: false };

		const updateData: any = {};
		if (title !== null) updateData.title = title;
		if (content !== null) updateData.content = content;

		await prisma.note.update({
			where: { id },
			data: updateData
		});

		return { success: true };
	},

	deleteNote: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user) return { success: false };

		const data = await event.request.formData();
		const id = data.get('id') as string;

		if (!id) return { success: false };

		await prisma.note.delete({
			where: { id }
		});

		return { success: true };
	},

	reorderNotes: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user) return { success: false };

		const data = await event.request.formData();
		const ids = JSON.parse(data.get('orderedIds') as string) as string[];

		await Promise.all(
			ids.map((id, index) =>
				prisma.note.update({
					where: { id },
					data: { order: index }
				})
			)
		);

		return { success: true };
	}
};
