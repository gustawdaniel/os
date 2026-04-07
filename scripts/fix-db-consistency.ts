import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('--- Sprawdzanie spójności kont użytkowników (Atlas) ---');

    const currentUser = await prisma.user.findUnique({ 
        where: { email: 'gustaw.daniel@gmail.com' } 
    });

    if (!currentUser) {
        console.error('❌ Nie znaleziono użytkownika: gustaw.daniel@gmail.com');
        return;
    }

    // Pobierz wszystkie konta
    const accounts = await prisma.account.findMany();
    console.log(`- Znaleziono ${accounts.length} rekordów w kolekcji Account.`);

    for (const acc of accounts) {
        const userExists = await prisma.user.findUnique({ where: { id: acc.userId } });

        if (!userExists) {
            console.log(`⚠️ Konto ${acc.providerAccountId} wskazuje na nieistniejącego użytkownika ${acc.userId}.`);
            console.log(`🔄 Przepinanie na poprawne konto: ${currentUser.id}`);
            
            await prisma.account.update({
                where: { id: acc.id },
                data: { userId: currentUser.id }
            });
            console.log('✅ Przepięto pomyślnie.');
        } else {
            console.log(`✅ Konto ${acc.providerAccountId} jest poprawnie powiązane z ${userExists.email}.`);
        }
    }

    console.log('--- Sprawdzanie zakończone ---');
}

main()
    .catch(e => {
        console.error('❌ Błąd skryptu:', e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
