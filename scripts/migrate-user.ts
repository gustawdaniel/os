import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    const oldEmail = 'daniel@personal-os.local';
    const newEmail = 'gustaw.daniel@gmail.com';

    console.log('--- Rozpoczynam migrację użytkownika ---');

    // 1. Najpierw naprawiamy brakujące daty w User (jeśli istnieją), 
    // które blokują findMany w Prisme
    try {
        await (prisma as any).$runCommandRaw({
            update: "User",
            updates: [
                {
                    q: { createdAt: null },
                    u: { $set: { createdAt: new Date(), updatedAt: new Date() } },
                    multi: true
                }
            ]
        });
        console.log('✅ Naprawiono brakujące daty w kolekcji User.');
    } catch (err) {
        console.log('ℹ️ Brak dat do naprawy lub inny błąd (pomijam):', err.message);
    }

    // 2. Szukamy użytkowników
    const oldUser = await prisma.user.findFirst({ 
        where: { email: oldEmail },
        select: { id: true, email: true }
    });
    const newUser = await prisma.user.findUnique({ 
        where: { email: newEmail },
        select: { id: true, email: true }
    });

    if (!oldUser) {
        console.log(`❌ Nie znaleziono użytkownika: ${oldEmail}. Migracja nie jest potrzebna.`);
        return;
    }

    if (newUser) {
        console.log(`🔄 Znaleziono oba konta. Przenoszę dane z ${oldUser.id} do ${newUser.id}...`);

        // Przenosimy relacje
        const habitsCount = await prisma.habit.updateMany({
            where: { userId: oldUser.id },
            data: { userId: newUser.id }
        });
        console.log(`- Przeniesiono ${habitsCount.count} nawyków.`);

        const notesCount = await prisma.note.updateMany({
            where: { userId: oldUser.id },
            data: { userId: newUser.id }
        });
        console.log(`- Przeniesiono ${notesCount.count} notatek.`);

        const activitiesCount = await prisma.activityLog.updateMany({
            where: { userId: oldUser.id },
            data: { userId: newUser.id }
        });
        console.log(`- Przeniesiono ${activitiesCount.count} logów aktywności.`);

        // Usuwamy starego użytkownika
        await prisma.user.delete({ where: { id: oldUser.id } });
        console.log(`✅ Usunięto stare konto: ${oldEmail}`);
    } else {
        console.log(`📝 Tylko stare konto istnieje. Zmieniam email na: ${newEmail}`);
        await prisma.user.update({
            where: { id: oldUser.id },
            data: { email: newEmail }
        });
        console.log('✅ Zaktualizowano email pomyślnie.');
    }

    console.log('--- Migracja zakończona ---');
}

main()
    .catch((e) => {
        console.error('❌ Błąd krytyczny migracji:', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
