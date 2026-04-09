import { prisma } from './prisma';

export async function syncTodoistTasks(userId: string, todoistApiKey: string, fetcher: typeof fetch) {
	try {
		const res = await fetcher('https://api.todoist.com/api/v1/sync', {
			method: 'POST',
			headers: { 
				Authorization: `Bearer ${todoistApiKey}`,
				'Content-Type': 'application/x-www-form-urlencoded'
			},
			body: new URLSearchParams({
				sync_token: '*',
				resource_types: JSON.stringify(['items', 'projects'])
			})
		});
		
		if (!res.ok) {
			const err = await res.text();
			console.error(`[Sync] Todoist API error: ${res.status}`, err);
			return [];
		}

		const data = await res.json();
		const items = data.items || [];
		
		console.log(`[Sync] Todoist items: ${items.length}`);
		
		const results = await Promise.all(items.map(async (t: any) => {
			const status = t.checked ? 'DONE' : (t.due ? 'NEXT' : 'INBOX');
			const scheduledAt = t.due?.date ? new Date(t.due.date) : null;
			
			console.log(`[Sync] Processing "${t.content}" -> Status: ${status}, Due: ${t.due?.date || 'None'}`);

			// Manual upsert because todoistId is not @unique in schema.prisma
			const existing = await prisma.gtdTask.findFirst({
				where: { userId, todoistId: t.id }
			});

			if (existing) {
				return prisma.gtdTask.update({
					where: { id: existing.id },
					data: {
						title: t.content,
						description: t.description || '',
						status: t.checked ? 'DONE' : undefined,
						scheduledAt: scheduledAt || undefined
					}
				});
			} else {
				return prisma.gtdTask.create({
					data: {
						userId,
						todoistId: t.id,
						title: t.content,
						description: t.description || '',
						status: status,
						scheduledAt: scheduledAt
					}
				});
			}
		}));

		return results;
	} catch (e) {
		console.error('[Sync] Todoist sync failed:', e);
		return [];
	}
}

export async function scheduleInGCal(userId: string, task: any, googleToken: string, fetcher: typeof fetch) {
	if (!task.scheduledAt) return null;

	const start = new Date(task.scheduledAt);
	const end = new Date(start.getTime() + (task.duration || 30) * 60000);

	const eventBody = {
		summary: task.title,
		description: task.description,
		start: { dateTime: start.toISOString() },
		end: { dateTime: end.toISOString() },
		colorId: task.color, // Preserved from GCal if possible
	};

	try {
		const url = task.gcalEventId 
			? `https://www.googleapis.com/calendar/v3/calendars/${task.gcalCalendarId || 'primary'}/events/${task.gcalEventId}`
			: `https://www.googleapis.com/calendar/v3/calendars/${task.gcalCalendarId || 'primary'}/events`;
		
		const res = await fetcher(url, {
			method: task.gcalEventId ? 'PATCH' : 'POST',
			headers: {
				Authorization: `Bearer ${googleToken}`,
				'Content-Type': 'application/json'
			},
			body: JSON.stringify(eventBody)
		});

		if (!res.ok) {
			const err = await res.text();
			console.error(`[Sync] GCal API error: ${res.status}`, err);
			return null;
		}

		const gcalEvent = await res.json();
		
		// Update GtdTask with the event ID
		await prisma.gtdTask.update({
			where: { id: task.id },
			data: { 
				gcalEventId: gcalEvent.id,
				gcalCalendarId: task.gcalCalendarId || 'primary'
			}
		});

		return gcalEvent;
	} catch (e) {
		console.error('[Sync] GCal schedule failed:', e);
		return null;
	}
}
