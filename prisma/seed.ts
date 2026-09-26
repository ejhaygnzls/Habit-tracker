import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {
      name: 'Demo User',
      passwordHash: await bcrypt.hash('password123', 10),
    },
    create: {
      email: 'demo@example.com',
      name: 'Demo User',
      passwordHash: await bcrypt.hash('password123', 10),
    },
  });

  const user = demoUser;

  const healthCategory = await prisma.category.upsert({
    where: { id: 'health-cat' },
    update: {},
    create: {
      id: 'health-cat',
      userId: user.id,
      name: 'Health',
      color: '#16a34a',
    },
  });

  const focusCategory = await prisma.category.upsert({
    where: { id: 'focus-cat' },
    update: {},
    create: {
      id: 'focus-cat',
      userId: user.id,
      name: 'Focus',
      color: '#8b5cf6',
    },
  });

  const habits = [
    {
      id: 'habit-water',
      name: 'Drink Water',
      icon: '💧',
      color: '#38bdf8',
      categoryId: healthCategory.id,
      frequencyType: 'daily',
      frequencyConfig: JSON.stringify({}),
      reminderTime: '08:00',
    },
    {
      id: 'habit-walk',
      name: 'Morning Walk',
      icon: '🚶',
      color: '#22c55e',
      categoryId: healthCategory.id,
      frequencyType: 'weekdays',
      frequencyConfig: JSON.stringify({ days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'] }),
      reminderTime: '07:30',
    },
    {
      id: 'habit-read',
      name: 'Read 20 Minutes',
      icon: '📚',
      color: '#f59e0b',
      categoryId: focusCategory.id,
      frequencyType: 'x_per_week',
      frequencyConfig: JSON.stringify({ target: 4 }),
      reminderTime: '20:30',
    },
  ] as const;

  for (const habit of habits) {
    await prisma.habit.upsert({
      where: { id: habit.id },
      update: {},
      create: {
        ...habit,
        userId: user.id,
      },
    });
  }

  const today = new Date();
  const dayOffsets = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  for (let index = 0; index < habits.length; index += 1) {
    const habit = habits[index];
    for (const offset of dayOffsets) {
      const date = new Date(today);
      date.setDate(date.getDate() - offset);
      const dateStr = date.toISOString().slice(0, 10);
      const completed = (offset + index) % 2 === 0;
      await prisma.habitLog.upsert({
        where: {
          habitId_date: {
            habitId: habit.id,
            date: dateStr,
          },
        },
        update: { completed },
        create: {
          habitId: habit.id,
          date: dateStr,
          completed,
          note: completed ? 'Done' : null,
        },
      });
    }
  }

  console.log('Seed completed');
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
