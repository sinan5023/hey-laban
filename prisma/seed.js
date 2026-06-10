const bcrypt = require("bcryptjs");
const { PrismaClient, UserRole } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const hashedPassword = await bcrypt.hash("admin123", 10);
  const cashierPassword = await bcrypt.hash("cashier123", 10);

  const shop = await prisma.shop.upsert({
    where: { id: "11111111-1111-1111-1111-111111111111" },
    update: {},
    create: {
      id: "11111111-1111-1111-1111-111111111111",
      name: "Hey Laban",
      address: "Edavannapara, Malappuram, Kerala",
      phone: "9876543210",
      email: "shop@heylaban.com",
    },
  });

  await prisma.user.upsert({
    where: { email: "cashier@heylaban.com" },
    update: {
      name: "Cashier User",
      password: cashierPassword,
      role: UserRole.CASHIER,
      isActive: true,
      shopId: shop.id,
    },
    create: {
      shopId: shop.id,
      name: "Cashier User",
      email: "cashier@heylaban.com",
      password: cashierPassword,
      role: UserRole.CASHIER,
      isActive: true,
    },
  });

  const admin = await prisma.user.upsert({
    where: { email: "admin@heylaban.com" },
    update: {},
    create: {
      shopId: shop.id,
      name: "Admin User",
      email: "admin@heylaban.com",
      password: hashedPassword,
      role: UserRole.ADMIN,
      isActive: true,
    },
  });

  const categoryInputs = [
    { name: "Others", sortOrder: 1 },
    { name: "Qashtutah", sortOrder: 2 },
    { name: "Shakes", sortOrder: 3 },
    { name: "Koshari", sortOrder: 4 },
    { name: "Salankatiya", sortOrder: 5 },
    { name: "Louah", sortOrder: 6 },
    { name: "Hebba Cakes", sortOrder: 7 },
  ];

  const categoryMap = {};

  for (const category of categoryInputs) {
    const savedCategory = await prisma.category.upsert({
      where: {
        shopId_name: {
          shopId: shop.id,
          name: category.name,
        },
      },
      update: {
        sortOrder: category.sortOrder,
        isActive: true,
      },
      create: {
        shopId: shop.id,
        name: category.name,
        sortOrder: category.sortOrder,
        isActive: true,
      },
    });

    categoryMap[category.name] = savedCategory;
  }

  const products = [
    { category: "Others", name: "Kabsa", price: 380, sortOrder: 1 },
    { category: "Others", name: "Creme De La Creme", price: 380, sortOrder: 2 },
    { category: "Others", name: "Lazy Cat", price: 250, sortOrder: 3 },
    { category: "Others", name: "Cheese Bomb", price: 290, sortOrder: 4 },
    { category: "Others", name: "Al Mazia", price: 250, sortOrder: 5 },
    { category: "Others", name: "Le Feel De Paris", price: 390, sortOrder: 6 },
    {
      category: "Others",
      name: "Fazea Chocola Cake",
      price: 390,
      sortOrder: 7,
    },

    { category: "Qashtutah", name: "Mango Qashtutah", price: 350, sortOrder: 1 },
    {
      category: "Qashtutah",
      name: "Pistachio Nutella Qashtutah",
      price: 350,
      sortOrder: 2,
    },

    { category: "Shakes", name: "Nutella Shakes", price: 150, sortOrder: 1 },
    { category: "Shakes", name: "Pistachio Shakes", price: 150, sortOrder: 2 },
    { category: "Shakes", name: "Lotus Shakes", price: 150, sortOrder: 3 },
    { category: "Shakes", name: "Hot Chocolate Shakes", price: 129, sortOrder: 4 },

    { category: "Koshari", name: "Trio Koshari", price: 350, sortOrder: 1 },
    { category: "Koshari", name: "Pistachio Lotus Koshari", price: 350, sortOrder: 2 },
    { category: "Koshari", name: "Kinder Nutella Koshari", price: 350, sortOrder: 3 },
    {
      category: "Koshari",
      name: "Pistachio Nutella Koshari",
      price: 350,
      sortOrder: 4,
    },

    {
      category: "Salankatiya",
      name: "Pistachio Nutella Salankatiya",
      price: 350,
      sortOrder: 1,
    },
    {
      category: "Salankatiya",
      name: "Pistachio Lotus Salankatiya",
      price: 350,
      sortOrder: 2,
    },
    { category: "Salankatiya", name: "Trio Salankatiya", price: 350, sortOrder: 3 },

    {
      category: "Louah",
      name: "Nutella Pistachio Kinder Louah",
      price: 350,
      sortOrder: 1,
    },
    { category: "Louah", name: "Chocolate Kinder Louah", price: 350, sortOrder: 2 },

    {
      category: "Hebba Cakes",
      name: "Belgium Chocolate Hebba Cake",
      price: 390,
      sortOrder: 1,
    },
    { category: "Hebba Cakes", name: "Kinder Hebba Cake", price: 350, sortOrder: 2 },
    { category: "Hebba Cakes", name: "Pistachio Hebba Cake", price: 350, sortOrder: 3 },
    { category: "Hebba Cakes", name: "Chocolate Hebba Cake", price: 350, sortOrder: 4 },
  ];

  await prisma.product.deleteMany({
    where: {
      categoryId: {
        in: Object.values(categoryMap).map((category) => category.id),
      },
    },
  });

  await prisma.product.createMany({
    data: products.map((product) => ({
      categoryId: categoryMap[product.category].id,
      name: product.name,
      description: null,
      price: product.price,
      sortOrder: product.sortOrder,
      isActive: true,
    })),
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  await prisma.dailyCounter.upsert({
    where: {
      shopId_date: {
        shopId: shop.id,
        date: today,
      },
    },
    update: {},
    create: {
      shopId: shop.id,
      date: today,
      lastToken: 0,
      lastOrder: 0,
      lastKot: 0,
    },
  });

  console.log("Seed completed successfully");
  console.log({
    shop: shop.name,
    adminEmail: admin.email,
    adminPassword: "admin123",
    categories: Object.keys(categoryMap).length,
    products: products.length,
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
