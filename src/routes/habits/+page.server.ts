import type { PageServerLoad, Actions } from './$types';
import { prisma } from '$lib/server/prisma';
import { startOfMonth, endOfMonth } from 'date-fns';
import { redirect } from '@sveltejs/kit';

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	if (!session?.user?.id) throw redirect(303, '/');

	const today = new Date();
	const firstDay = startOfMonth(today);
	const lastDay = endOfMonth(today);

	const habits = await prisma.habit.findMany({
		where: { userId: session.user.id },
		include: {
			logs: {
				where: { date: { gte: firstDay, lte: lastDay } }
			}
		},
		orderBy: { order: 'asc' }
	});

	return { habits, user: session.user, currentMonth: today.toISOString() };
};

export const actions: Actions = {
	toggleLog: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user) return { success: false };

		const data = await event.request.formData();
		const habitId = data.get('habitId') as string;
		const dateStr = data.get('date') as string;
		const note = data.get('note') as string;
		const value = data.get('value') ? parseInt(data.get('value') as string) : null;

		const date = new Date(dateStr);

		const existingLog = await prisma.habitLog.findUnique({
			where: { habitId_date: { habitId, date } }
		});

		if (existingLog) {
			await prisma.habitLog.delete({ where: { id: existingLog.id } });
		} else {
			await prisma.habitLog.create({
				data: {
					habitId,
					date,
					note: note || undefined,
					value: value || undefined,
					completed: true
				}
			});
		}
		return { success: true };
	},

	createHabit: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) return { success: false };

		const data = await event.request.formData();
		const name = data.get('name') as string;
		const target = parseInt(data.get('target') as string) || 10;
		if (!name) return { success: false };

		const last = await prisma.habit.findFirst({
			where: { userId: session.user.id },
			orderBy: { order: 'desc' }
		});

		const newOrder = last ? last.order + 1 : 0;

		await prisma.habit.create({
			data: {
				userId: session.user.id,
				name,
				goalType: 'monthly',
				goalTarget: target,
				color: 'indigo',
				order: newOrder
			}
		});
		return { success: true };
	},

	editHabit: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user) return { success: false };

		const data = await event.request.formData();
		const id = data.get('id') as string;
		const name = data.get('name') as string;
		const target = parseInt(data.get('target') as string) || 10;
		if (!id || !name) return { success: false };

		await prisma.habit.update({
			where: { id },
			data: { name, goalTarget: target }
		});
		return { success: true };
	},

	deleteHabit: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user) return { success: false };

		const data = await event.request.formData();
		const id = data.get('id') as string;
		if (!id) return { success: false };

		await prisma.habitLog.deleteMany({ where: { habitId: id } });
		await prisma.habit.delete({ where: { id } });
		return { success: true };
	},

	reorder: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user) return { success: false };

		const data = await event.request.formData();
		const orderedIds = JSON.parse(data.get('orderedIds') as string) as string[];

		await Promise.all(
			orderedIds.map((id, index) =>
				prisma.habit.update({ where: { id }, data: { order: index } })
			)
		);
		return { success: true };
	}
};
