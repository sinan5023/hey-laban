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
const getManagementCatalogue = async ({ shopId }) => {
  if (!shopId) {
    throw new ApiError(400, "Shop ID is required");
  }

  const categories = await prisma.category.findMany({
    where: {
      shopId,
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      name: true,
      sortOrder: true,
      isActive: true,
      products: {
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
        select: {
          id: true,
          name: true,
          description: true,
          price: true,
          sortOrder: true,
          isActive: true,
          categoryId: true,
          productIngredients: {
            include: {
              rawMaterial: { select: { id: true, name: true } },
            },
          },
        },
      },
    },
  });

  return {
    categories: categories.map((category) => ({
      id: category.id,
      name: category.name,
      sortOrder: category.sortOrder,
      isActive: category.isActive,
      products: category.products.map((product) => ({
        id: product.id,
        categoryId: product.categoryId,
        name: product.name,
        description: product.description,
        price: product.price.toNumber(),
        sortOrder: product.sortOrder,
        isActive: product.isActive,
        rawMaterial: product.productIngredients?.[0]?.rawMaterial || null,
      })),
    })),
  };
};

const createProduct = async ({
  shopId,
  categoryId,
  name,
  description,
  price,
  sortOrder,
}) => {
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

const updateProduct = async ({
  id,
  shopId,
  name,
  description,
  price,
  sortOrder,
}) => {
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
      description:
        description !== undefined ? description : existingProduct.description,
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

  const existingProduct = await prisma.product.findFirst({
    where: { id },
  });

  if (!existingProduct) {
    throw new ApiError(404, "Product not found");
  }

  // Hard delete the product.
  // OrderItem and KotItem rows are kept, productId becomes NULL.
  await prisma.product.delete({
    where: { id },
  });

  return {
    success: true,
    message: "Product deleted successfully",
  };
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

const linkProductToRawMaterial = async ({ productId, rawMaterialId, shopId }) => {
  // Verify product
  const product = await prisma.product.findFirst({
    where: { id: productId },
  });
  if (!product) throw new ApiError(404, "Product not found");

  // Verify raw material belongs to shop
  const rawMaterial = await prisma.rawMaterial.findFirst({
    where: { id: rawMaterialId, shopId },
  });
  if (!rawMaterial) throw new ApiError(404, "Raw material not found");

  // UPSERT the product ingredient (1 product = 1 base assumption)
  const ingredient = await prisma.productIngredient.upsert({
    where: { productId },
    update: { rawMaterialId },
    create: {
      productId,
      rawMaterialId,
      quantity: 1, // Defaulting to 1 as per design
    },
  });

  return ingredient;
};

const unlinkProductFromRawMaterial = async ({ productId, shopId }) => {
  const product = await prisma.product.findFirst({
    where: { id: productId },
  });
  if (!product) throw new ApiError(404, "Product not found");

  await prisma.productIngredient.deleteMany({
    where: { productId },
  });

  return { success: true };
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
    where: {
      id,
      shopId, // ensure it belongs to this shop
    },
  });

  if (!existingCategory) {
    throw new ApiError(404, "Category not found");
  }

  // Hard delete the category.
  // Products in this category will be cascade-deleted automatically.
  await prisma.category.delete({
    where: { id },
  });

  return {
    success: true,
    message: "Category and its products deleted successfully",
  };
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
  getManagementCatalogue,
  createProduct,
  updateProduct,
  deleteProduct,
  toggleProductInactive,
  linkProductToRawMaterial,
  unlinkProductFromRawMaterial,
  createCategory,
  updateCategory,
  deleteCategory,
  toggleCategoryInactive,
};
