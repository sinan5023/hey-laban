const ApiError = require("../helpers/ApiError");
const prisma = require("../lib/prisma");

// ========== CATALOGUE (existing) ==========
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
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sortOrder: true,
      products: {
        where: {
          isActive: true,
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
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

// ========== PRODUCTS (new CRUD) ==========
const createProduct = async ({ shopId, categoryId, name, description, price, sortOrder }) => {
  if (!name || !price) {
    throw new ApiError(400, "Name and price are required");
  }

  // If categoryId provided, verify it belongs to shop
  if (categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: categoryId, shopId },
    });
    if (!category) {
      throw new ApiError(404, "Category not found");
    }
  }

  const product = await prisma.product.create({
    data: {
      categoryId: categoryId || null,
      name,
      description: description || null,
      price: price,
      sortOrder: sortOrder || 0,
      isActive: true,
    },
  });

  return product;
};

const updateProduct = async ({ id, shopId, name, description, price, sortOrder }) => {
  if (!id) {
    throw new ApiError(400, "Product ID is required");
  }

  // Verify product exists
  const existingProduct = await prisma.product.findFirst({
    where: { id },
  });

  if (!existingProduct) {
    throw new ApiError(404, "Product not found");
  }

  // If categoryId provided, verify it belongs to shop
  // if (categoryId) {
  //   const category = await prisma.category.findFirst({
  //     where: { id: categoryId, shopId },
  //   });
  //   if (!category) {
  //     throw new ApiError(404, "Category not found");
  //   }
  // }

  const product = await prisma.product.update({
    where: { id },
    data: {
      name: name || existingProduct.name,
      description: description !== undefined ? description : existingProduct.description,
      price: price || existingProduct.price,
      sortOrder: sortOrder || existingProduct.sortOrder,
    },
  });

  return product;
};

const deleteProduct = async ({ id, shopId }) => {
  if (!id) {
    throw new ApiError(400, "Product ID is required");
  }

  // Verify product exists
  const existingProduct = await prisma.product.findFirst({
    where: { id },
  });

  if (!existingProduct) {
    throw new ApiError(404, "Product not found");
  }

  // Soft delete: set isActive to false
  const product = await prisma.product.update({
    where: { id },
    data: { isActive: false },
  });

  return { success: true, message: "Product deleted successfully", product };
};

const toggleProductInactive = async ({ id, shopId, isActive }) => {
  if (!id) {
    throw new ApiError(400, "Product ID is required");
  }

  if (isActive === undefined) {
    throw new ApiError(400, "isActive value is required");
  }

  const existingProduct = await prisma.product.findFirst({
    where: { id },
  });

  if (!existingProduct) {
    throw new ApiError(404, "Product not found");
  }

  const product = await prisma.product.update({
    where: { id },
    data: { isActive: isActive },
  });

  return product;
};

// ========== CATEGORIES (new CRUD) ==========
const createCategory = async ({ shopId, name, sortOrder }) => {
  if (!name) {
    throw new ApiError(400, "Category name is required");
  }

  // Check for duplicate category name in shop
  const existingCategory = await prisma.category.findFirst({
    where: { shopId, name },
  });

  if (existingCategory) {
    throw new ApiError(409, "Category name already exists");
  }

  const category = await prisma.category.create({
    data: {
      shopId,
      name,
      sortOrder: sortOrder || 0,
      isActive: true,
    },
  });

  return category;
};

const updateCategory = async ({ id, shopId, name, sortOrder }) => {
  if (!id) {
    throw new ApiError(400, "Category ID is required");
  }

  const existingCategory = await prisma.category.findFirst({
    where: { id },
  });

  if (!existingCategory) {
    throw new ApiError(404, "Category not found");
  }

  // Check for duplicate name if name is being changed
  if (name && name !== existingCategory.name) {
    const duplicateCategory = await prisma.category.findFirst({
      where: { shopId, name },
    });

    if (duplicateCategory) {
      throw new ApiError(409, "Category name already exists");
    }
  }

  const category = await prisma.category.update({
    where: { id },
    data: {
      name: name || existingCategory.name,
      sortOrder: sortOrder || existingCategory.sortOrder,
    },
  });

  return category;
};

const deleteCategory = async ({ id, shopId }) => {
  if (!id) {
    throw new ApiError(400, "Category ID is required");
  }

  const existingCategory = await prisma.category.findFirst({
    where: { id },
  });

  if (!existingCategory) {
    throw new ApiError(404, "Category not found");
  }

  // Soft delete: set isActive to false
  const category = await prisma.category.update({
    where: { id },
    data: { isActive: false },
  });

  return { success: true, message: "Category deleted successfully", category };
};

const toggleCategoryInactive = async ({ id, shopId, isActive }) => {
  if (!id) {
    throw new ApiError(400, "Category ID is required");
  }

  if (isActive === undefined) {
    throw new ApiError(400, "isActive value is required");
  }

  const existingCategory = await prisma.category.findFirst({
    where: { id },
  });

  if (!existingCategory) {
    throw new ApiError(404, "Category not found");
  }

  const category = await prisma.category.update({
    where: { id },
    data: { isActive: isActive },
  });

  return category;
};

module.exports = {
  getCatalogue,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductInactive,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryInactive,
};
