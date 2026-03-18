import { PrismaClient } from '@prisma/client';
import { hashPassword } from '../src/lib/auth';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding DriveIQ database...');

  // Admin operator
  const adminHash = await hashPassword('driveiq-admin-2024');
  const admin = await prisma.operator.upsert({
    where: { email: 'admin@driveiq.local' },
    update: {},
    create: {
      email: 'admin@driveiq.local',
      name: 'Admin',
      passwordHash: adminHash,
      role: 'ADMIN',
    },
  });
  console.log('Created operator:', admin.email);

  // Menu items
  const menuItems = [
    // COFFEE
    { name: 'Espresso', category: 'COFFEE', price: 2.75, description: 'Double shot, rich and bold', tags: '["classic"]', sortOrder: 1 },
    { name: 'Latte', category: 'COFFEE', price: 4.50, description: 'Espresso + steamed milk', tags: '["popular","customizable"]', sortOrder: 2 },
    { name: 'Oat Milk Latte', category: 'COFFEE', price: 5.25, description: 'Latte with creamy oat milk', tags: '["vegan","popular"]', sortOrder: 3 },
    { name: 'Cappuccino', category: 'COFFEE', price: 4.25, description: 'Equal parts espresso, steamed milk, foam', tags: '["classic"]', sortOrder: 4 },
    { name: 'Flat White', category: 'COFFEE', price: 4.75, description: 'Ristretto + microfoam', tags: '["strong"]', sortOrder: 5 },
    { name: 'Cold Brew', category: 'COFFEE', price: 4.50, description: '24-hour cold brew concentrate', tags: '["cold","popular"]', sortOrder: 6 },
    { name: 'Americano', category: 'COFFEE', price: 3.50, description: 'Espresso + hot water', tags: '["classic"]', sortOrder: 7 },
    { name: 'Cortado', category: 'COFFEE', price: 3.75, description: 'Equal espresso and warm milk', tags: '["strong"]', sortOrder: 8 },
    // TEA
    { name: 'Matcha Latte', category: 'TEA', price: 5.00, description: 'Ceremonial matcha + oat milk', tags: '["vegan","popular"]', sortOrder: 10 },
    { name: 'Chai Latte', category: 'TEA', price: 4.75, description: 'Spiced masala chai + steamed milk', tags: '["popular"]', sortOrder: 11 },
    { name: 'Earl Grey Tea', category: 'TEA', price: 3.25, description: 'Bergamot black tea', tags: '["classic"]', sortOrder: 12 },
    // COLD DRINKS
    { name: 'Iced Latte', category: 'COLD_DRINK', price: 5.00, description: 'Espresso over ice + milk', tags: '["cold","popular"]', sortOrder: 20 },
    { name: 'Iced Matcha', category: 'COLD_DRINK', price: 5.50, description: 'Matcha + oat milk over ice', tags: '["cold","vegan"]', sortOrder: 21 },
    { name: 'Sparkling Water', category: 'COLD_DRINK', price: 2.50, description: 'San Pellegrino', tags: '[]', sortOrder: 22 },
    { name: 'Fresh OJ', category: 'COLD_DRINK', price: 4.00, description: 'Freshly squeezed orange juice', tags: '["fresh"]', sortOrder: 23 },
    // FOOD
    { name: 'Butter Croissant', category: 'FOOD', price: 3.75, description: 'Flaky, golden croissant', tags: '["popular","bakery"]', sortOrder: 30 },
    { name: 'Avocado Toast', category: 'FOOD', price: 7.50, description: 'Sourdough, smashed avocado, chili flakes', tags: '["vegan","popular"]', sortOrder: 31 },
    { name: 'Almond Croissant', category: 'FOOD', price: 4.25, description: 'Filled with almond cream', tags: '["bakery","popular"]', sortOrder: 32 },
    { name: 'Banana Bread', category: 'FOOD', price: 3.50, description: 'House-made banana walnut bread', tags: '["bakery"]', sortOrder: 33 },
    { name: 'Egg & Cheese Sandwich', category: 'FOOD', price: 6.75, description: 'Brioche, scrambled egg, aged cheddar', tags: '["breakfast","popular"]', sortOrder: 34 },
    // SPECIALTY
    { name: 'Lavender Latte', category: 'SPECIALTY', price: 6.00, description: 'Espresso + lavender syrup + oat milk', tags: '["seasonal","popular"]', sortOrder: 40 },
    { name: 'Brown Sugar Oat Latte', category: 'SPECIALTY', price: 6.25, description: 'Espresso + brown sugar syrup + oat milk', tags: '["popular","sweet"]', sortOrder: 41 },
    { name: 'Dirty Matcha', category: 'SPECIALTY', price: 6.50, description: 'Matcha + espresso shot over oat milk', tags: '["bold","popular"]', sortOrder: 42 },
  ];

  for (const item of menuItems) {
    await prisma.menuItem.upsert({
      where: { id: item.name.replace(/\s+/g, '-').toLowerCase() },
      update: { price: item.price, available: true },
      create: {
        id: item.name.replace(/\s+/g, '-').toLowerCase(),
        ...item,
      },
    });
  }
  console.log(`Created ${menuItems.length} menu items`);

  // Default system settings
  const settings = [
    { key: 'TAX_RATE', value: '0.0875' },
    { key: 'POINTS_PER_DOLLAR', value: '10' },
    { key: 'TIER_SILVER_THRESHOLD', value: '500' },
    { key: 'TIER_GOLD_THRESHOLD', value: '1500' },
    { key: 'TIER_PLATINUM_THRESHOLD', value: '5000' },
    { key: 'USUAL_ORDER_THRESHOLD', value: '0.70' },
    { key: 'LPR_CONFIDENCE_THRESHOLD', value: '0.75' },
    { key: 'SHOP_NAME', value: 'DriveIQ Coffee' },
  ];

  for (const s of settings) {
    await prisma.systemSetting.upsert({
      where: { key: s.key },
      update: {},
      create: s,
    });
  }
  console.log('Created system settings');

  // Sample customer
  const customer = await prisma.customer.upsert({
    where: { email: 'jane@example.com' },
    update: {},
    create: {
      name: 'Jane Smith',
      email: 'jane@example.com',
      phone: '+15551234567',
      rewardPoints: 340,
      tier: 'SILVER',
      preferences: JSON.stringify(['oat milk', 'no sugar']),
      allergies: JSON.stringify(['nuts']),
      notes: 'Prefers her drinks extra hot. Regulars since 2023.',
      visitCount: 47,
      lastVisitAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
      vehicles: {
        create: {
          licensePlate: 'ABC1234',
          make: 'Toyota',
          model: 'Prius',
          color: 'Silver',
          year: 2021,
          isPrimary: true,
        },
      },
    },
  });
  console.log('Created sample customer:', customer.name);

  console.log('\nDriveIQ seed complete!');
  console.log('Login: admin@driveiq.local / driveiq-admin-2024');
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
