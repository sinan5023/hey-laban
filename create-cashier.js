const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
  // 1. Create the new shop
  const shop = await prisma.shop.create({
    data: { 
      name: "Hey Leban", // Feel free to change this
      address: "Blue Diamond Mall , Kozhikode ",  // Feel free to change this
      phone: "+91 6381554322", // Feel free to change this
    }
  });

  // 2. Hash the password for the new user
  const hashedPassword = await bcrypt.hash("password123", 10);
  
  // 3. Create the Cashier user attached to the new shop
  const user = await prisma.user.create({
    data: {
      shopId: shop.id,
      name: "ashiss",
      email: "ashissm05@gmail.com", // Feel free to change this
      password: hashedPassword,
      role: "CASHIER", // Set to CASHIER role
      isActive: true
    }
  });

  console.log("✅ Successfully created Shop and Cashier!");
  console.log("-----------------------------------------");
  console.log("Shop ID:", shop.id);
  console.log("Shop Name:", shop.name);
  console.log("Cashier Email:", user.email);
  console.log("Cashier Password: password123");
}

main()
  .catch((e) => {
    console.error("❌ Error creating shop and user:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
