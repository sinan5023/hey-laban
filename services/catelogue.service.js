const { PrismaClient } = require("@prisma/client");
const ApiError = require("../helpers/ApiError");

const prisma = require("../lib/prisma")

const getCatalogue = async ({ shopId }) => {
  if (!shopId) {
    throw new ApiError(400, "Shop ID is required");
  }

  const categories = await prisma.category.findMany({
    where: {
      shopId,
      isActive: true,
      products: {
        some: {
          isActive: true,
        },
      },
    },
    orderBy: [
      { sortOrder: "asc" },
      { name: "asc" },
    ],
    select: {
      id: true,
      name: true,
      sortOrder: true,
      products: {
        where: {
          isActive: true,
        },
        orderBy: [
          { sortOrder: "asc" },
          { name: "asc" },
        ],
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          sortOrder: true,
        },
      },
    },
  });

  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sortOrder,
      products: category.products.map((product) => ({
        id: product.id,
        name: product.name,
        description: product.description,
        price: product.price.toNumber(),
        sortOrder: product.sortOrder,
      })),
    })),
  };
};

module.exports = {
  getCatalogue,
};