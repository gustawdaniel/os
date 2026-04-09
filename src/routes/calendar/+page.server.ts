import { prisma } from '$lib/server/prisma';
import { redirect } from '@sveltejs/kit';
import { startOfDay, endOfDay } from 'date-fns';
import { getGoogleAccessToken } from '$lib/server/google';
import { syncTodoistTasks } from '$lib/server/sync';

// Enforce explicit European/Warsaw Timezone on the Server backend to fix shifts
process.env.TZ = 'Europe/Warsaw';

function isValidObjectId(id: string) {
	return /^[0-9a-fA-F]{24}$/.test(id);
}

export const load: PageServerLoad = async (event) => {
	const session = await event.locals.auth();
	if (!session?.user?.id) throw redirect(303, '/');

	const now = new Date();
	// Fetch for full 24h range centered around today to avoid timezone issues
	const startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
	const endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

	const [todoist, googleToken, timeEntries] = await Promise.all([
		prisma.userIntegration.findUnique({
			where: { userId_provider: { userId: session.user.id, provider: 'todoist' } }
		}),
		getGoogleAccessToken(session.user.id, event.fetch),
		prisma.timeEntry.findMany({
			where: {
				userId: session.user.id,
				OR: [{ startAt: { gte: startDate, lte: endDate } }, { endAt: null }]
			},
			orderBy: { startAt: 'asc' }
		})
	]);

	// Sync Todoist tasks into GtdTask (Inbox)
	if (todoist?.apiKey) {
		await syncTodoistTasks(session.user.id, todoist.apiKey, event.fetch);
	}

	// Fetch native GTD tasks
	const gtdTasks = await prisma.gtdTask.findMany({
		where: { userId: session.user.id, status: { not: 'TRASH' } },
		orderBy: { createdAt: 'desc' }
	});

	let calendarEvents: any[] = [];
	let todoistTasks: any[] = [];

	// Google Calendar
	if (googleToken) {
		try {
			// Fetch list of calendars first
			const listRes = await event.fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList', {
				headers: { Authorization: `Bearer ${googleToken}` }
			});
			const listData = await listRes.json();
			
			if (!listRes.ok) {
				console.error(`[GCal] CalendarList API error ${listRes.status}:`, JSON.stringify(listData));
			}

			const calendars = listData.items || [];
			console.log(`[GCal] Found ${calendars.length} calendars. Status: ${listRes.status}`);

			// Fetch events from all calendars in parallel
			const allEventsPromises = calendars.map(async (cal: any) => {
				try {
					const res = await event.fetch(
						`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(cal.id)}/events?timeMin=${startDate.toISOString()}&timeMax=${endDate.toISOString()}&singleEvents=true&orderBy=startTime`,
						{ headers: { Authorization: `Bearer ${googleToken}` } }
					);
					const data = await res.json();
					return (data.items || []).map((ev: any) => ({ ...ev, calendarName: cal.summary, calendarId: cal.id }));
				} catch (e) {
					console.error(`[GCal] Error fetching calendar ${cal.summary}:`, e);
					return [];
				}
			});

			const results = await Promise.all(allEventsPromises);
			calendarEvents = results.flat().sort((a, b) => {
				const startA = a.start?.dateTime || a.start?.date || '';
				const startB = b.start?.dateTime || b.start?.date || '';
				return startA.localeCompare(startB);
			});

			console.log(`[GCal] Total ${calendarEvents.length} events fetched from all calendars.`);
			if (calendarEvents.length > 0) {
				console.log(`[GCal] Sample events:`, calendarEvents.slice(0, 3).map((it: any) => ({
					summary: it.summary,
					calendar: it.calendarName,
					start: it.start
				})));
			}
		} catch (e) {
			console.error('GCal multi-fetch error:', e);
		}
	}

	// Legacy sync for Todoist removed - now using syncTodoistTasks utility

	return {
		calendarEvents,
		gtdTasks, // Now returning unified GTD tasks
		timeEntries,
		integrationsSet: {
			todoist: !!todoist,
			google: !!googleToken
		}
	};
};

export const actions: Actions = {
	completeTask: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) return { success: false };

		const data = await event.request.formData();
		const taskId = data.get('taskId') as string;

		const todoist = await prisma.userIntegration.findUnique({
			where: { userId_provider: { userId: session.user.id, provider: 'todoist' } }
		});
		if (!todoist?.apiKey || !taskId) return { success: false };

		try {
			// 1. Sync to Todoist if linked
			await event.fetch(`https://api.todoist.com/api/v1/tasks/${taskId}/close`, {
				method: 'POST',
				headers: { Authorization: `Bearer ${todoist.apiKey}` }
			});

			// 2. Update local GtdTask if it exists
			const gtdTask = await prisma.gtdTask.findUnique({ where: { todoistId: taskId } });
			if (gtdTask) {
				await prisma.gtdTask.update({
					where: { id: gtdTask.id },
					data: { status: 'DONE' }
				});

				// 3. Remove from GCal if scheduled
				if (gtdTask.gcalEventId) {
					const googleToken = await getGoogleAccessToken(session.user.id, event.fetch);
					if (googleToken) {
						await event.fetch(`https://www.googleapis.com/calendar/v3/calendars/${gtdTask.gcalCalendarId || 'primary'}/events/${gtdTask.gcalEventId}`, {
							method: 'DELETE',
							headers: { Authorization: `Bearer ${googleToken}` }
						});
					}
				}
			}

			return { success: true };
		} catch (e) {
			console.error('[Sync] Complete task failed:', e);
			return { success: false };
		}
	},

	deleteGtdTask: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) return { success: false };

		const form = await event.request.formData();
		const id = form.get('id') as string;
		if (!id || !isValidObjectId(id)) {
			console.warn('[Action] Skipping deleteGtdTask for non-ObjectID:', id);
			return { success: false };
		}

		const task = await prisma.gtdTask.findUnique({ where: { id, userId: session.user.id } });
		if (!task) return { success: false };

		try {
			// 1. Delete from Todoist if linked
			if (task.todoistId) {
				const todoist = await prisma.userIntegration.findUnique({
					where: { userId_provider: { userId: session.user.id, provider: 'todoist' } }
				});
				if (todoist?.apiKey) {
					await event.fetch(`https://api.todoist.com/api/v1/tasks/${task.todoistId}`, {
						method: 'DELETE',
						headers: { Authorization: `Bearer ${todoist.apiKey}` }
					});
				}
			}

			// 2. Delete from GCal if linked
			if (task.gcalEventId) {
				const googleToken = await getGoogleAccessToken(session.user.id, event.fetch);
				if (googleToken) {
					await event.fetch(`https://www.googleapis.com/calendar/v3/calendars/${task.gcalCalendarId || 'primary'}/events/${task.gcalEventId}`, {
						method: 'DELETE',
						headers: { Authorization: `Bearer ${googleToken}` }
					});
				}
			}

			// 3. Delete local
			await prisma.gtdTask.delete({ where: { id } });

			return { success: true };
		} catch (e) {
			console.error('[Sync] Delete task failed:', e);
			return { success: false };
		}
	},

	startTimer: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) return { success: false };

		const data = await event.request.formData();
		const description = data.get('description') as string || '';

		// Zatrzymaj ewentualnie aktywny wpis
		await prisma.timeEntry.updateMany({
			where: { userId: session.user.id, endAt: null },
			data: { endAt: new Date() }
		});

		await prisma.timeEntry.create({
			data: { userId: session.user.id, description, startAt: new Date() }
		});

		return { success: true };
	},

	stopTimer: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) return { success: false };

		const form = await event.request.formData();
		const id = form.get('id') as string;

		try {
			if (id) {
				const result = await prisma.timeEntry.update({
					where: { id, userId: session.user.id },
					data: { endAt: new Date() }
				});
				console.log(`[Timer] Stopped specific entry ${id} for user ${session.user.id}`);
			} else {
				const result = await prisma.timeEntry.updateMany({
					where: { userId: session.user.id, endAt: null },
					data: { endAt: new Date() }
				});
				console.log(`[Timer] Stopped ${result.count} entries for user ${session.user.id}`);
			}
			return { success: true };
		} catch (error) {
			console.error('[Timer] Stop error:', error);
			return { success: false };
		}
	},

	deleteEntry: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) return { success: false };

		const data = await event.request.formData();
		const id = data.get('id') as string;
		if (!id || !isValidObjectId(id)) return { success: false };

		await prisma.timeEntry.delete({ where: { id, userId: session.user.id } });
		return { success: true };
	},

	updateDescription: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) return { success: false };

		const data = await event.request.formData();
		const id = data.get('id') as string;
		const description = data.get('description') as string;

		await prisma.timeEntry.update({
			where: { id, userId: session.user.id },
			data: { description }
		});

		return { success: true };
	},

	quickAddTask: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) return { success: false };

		const form = await event.request.formData();
		const title = form.get('title') as string;
		const scheduledAt = form.get('scheduledAt') as string;
		if (!title) return { success: false };

		const task = await prisma.gtdTask.create({
			data: {
				userId: session.user.id,
				title,
				status: scheduledAt ? 'NEXT' : 'INBOX',
				scheduledAt: scheduledAt ? new Date(scheduledAt) : null
			}
		});

		// If scheduled, sync to Google Calendar
		if (scheduledAt) {
			const googleToken = await getGoogleAccessToken(session.user.id, event.fetch);
			if (googleToken) {
				const { scheduleInGCal } = await import('$lib/server/sync');
				await scheduleInGCal(session.user.id, task, googleToken, event.fetch);
			}
		}

		return { success: true };
	},

	scheduleTask: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) return { success: false };

		const form = await event.request.formData();
		const id = form.get('id') as string;
		const scheduledAt = form.get('scheduledAt') as string;

		if (!id || !scheduledAt) return { success: false };

		const task = await prisma.gtdTask.update({
			where: { id, userId: session.user.id },
			data: { 
				scheduledAt: new Date(scheduledAt),
				status: 'NEXT' 
			}
		});

		const googleToken = await getGoogleAccessToken(session.user.id, event.fetch);
		if (googleToken) {
			const { scheduleInGCal } = await import('$lib/server/sync');
			await scheduleInGCal(session.user.id, task, googleToken, event.fetch);
		}

		return { success: true };
	},

	updateGtdTask: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) return { success: false };

		const form = await event.request.formData();
		const id = form.get('id') as string;
		const title = form.get('title') as string;
		const description = form.get('description') as string;
		const scheduledAt = form.get('scheduledAt') as string;
		const duration = form.get('duration') as string;

		if (!id || !isValidObjectId(id)) {
			console.warn('[Sync] Skipping updateGtdTask for non-ObjectID:', id);
			return { success: false };
		}

		const updateData: any = {};
		if (title !== null) updateData.title = title;
		if (description !== null) updateData.description = description || '';
		if (scheduledAt !== null) {
			updateData.scheduledAt = scheduledAt ? new Date(scheduledAt) : null;
			if (updateData.scheduledAt) updateData.status = 'NEXT';
			else updateData.status = 'INBOX';
		}
		if (duration !== null) updateData.duration = parseInt(duration);

		const task = await prisma.gtdTask.update({
			where: { id, userId: session.user.id },
			data: updateData
		});

		// Sync with GCal if scheduled
		const googleToken = await getGoogleAccessToken(session.user.id, event.fetch);
		if (googleToken && (task.scheduledAt || task.gcalEventId)) {
			const { scheduleInGCal } = await import('$lib/server/sync');
			await scheduleInGCal(session.user.id, task, googleToken, event.fetch);
		}

		return { success: true };
	},

	updateTimeEntry: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) return { success: false };

		const form = await event.request.formData();
		const id = form.get('id') as string;
		const description = form.get('description') as string;
		const startAt = form.get('startAt') as string;
		const endAt = form.get('endAt') as string;

		if (!id || !isValidObjectId(id)) return { success: false };

		const updateData: any = {};
		if (description !== null) updateData.description = description || '';
		if (startAt !== null) updateData.startAt = new Date(startAt);
		if (endAt !== null) updateData.endAt = endAt ? new Date(endAt) : null;

		await prisma.timeEntry.update({
			where: { id, userId: session.user.id },
			data: updateData
		});

		return { success: true };
	},

	updateGCalEvent: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) return { success: false };

		const form = await event.request.formData();
		const id = form.get('id') as string;
		const calendarId = form.get('calendarId') as string || 'primary';
		const startAt = form.get('startAt') as string;
		const endAt = form.get('endAt') as string;

		if (!id || !startAt || !endAt) return { success: false };

		const googleToken = await getGoogleAccessToken(session.user.id, event.fetch);
		if (!googleToken) return { success: false };

		// Wait for sync to avoid reverting state when UI invalidates
		const patchData = {
			start: { dateTime: new Date(startAt).toISOString() },
			end: { dateTime: new Date(endAt).toISOString() }
		};

		try {
			const res = await event.fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${id}`, {
				method: 'PATCH',
				headers: { 
					Authorization: `Bearer ${googleToken}`,
					'Content-Type': 'application/json'
				},
				body: JSON.stringify(patchData)
			});
			if (!res.ok) {
				const err = await res.json();
				console.error('[GCal-Sync] Sync failed:', JSON.stringify(err));
				const fs = await import('fs');
				fs.writeFileSync('/tmp/gcal_err.log', JSON.stringify({ req: patchData, calendarId, id, err }, null, 2));
			} else {
				console.log('[GCal-Sync] Sync successful for event:', id);
			}
		} catch (err: any) {
			console.error('[GCal-Sync] Network error:', err);
			const fs = await import('fs');
			fs.writeFileSync('/tmp/gcal_err.log', JSON.stringify({ networkErr: err?.message || err }, null, 2));
		}

		return { success: true };
	},

	quickAddEntry: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) return { success: false };

		const form = await event.request.formData();
		const description = form.get('description') as string;
		const startAt = form.get('startAt') as string;
		const duration = parseInt(form.get('duration') as string || '30');
		
		if (!description || !startAt) return { success: false };

		const start = new Date(startAt);
		const end = new Date(start.getTime() + duration * 60000);

		await prisma.timeEntry.create({
			data: {
				userId: session.user.id,
				description,
				startAt: start,
				endAt: end
			}
		});

		return { success: true };
	},

	deleteGCalEvent: async (event) => {
		const session = await event.locals.auth();
		if (!session?.user?.id) return { success: false };

		const form = await event.request.formData();
		const id = form.get('id') as string;
		const calendarId = form.get('calendarId') as string || 'primary';

		if (!id) return { success: false };

		const googleToken = await getGoogleAccessToken(session.user.id, event.fetch);
		if (!googleToken) return { success: false };

		try {
			const res = await event.fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events/${id}`, {
				method: 'DELETE',
				headers: { Authorization: `Bearer ${googleToken}` }
			});

			if (!res.ok && res.status !== 404) {
				const err = await res.json();
				console.error('[Action] GCal delete failed:', JSON.stringify(err));
				return { success: false };
			}

			return { success: true };
		} catch (e) {
			console.error('[Action] GCal delete networking error:', e);
			return { success: false };
		}
	}
};



