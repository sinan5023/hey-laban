// items.validation.js - Joi schemas for all endpoints
const Joi = require("joi");

// ========== CATALOGUE ==========
const getCatalogueSchema = Joi.object({
  query: Joi.object({
    page: Joi.number().integer().min(1),
    limit: Joi.number().integer().min(1).max(100),
  }).optional(),
});

// ========== PRODUCTS ==========
const createItemSchema = Joi.object({
  body: Joi.object({
    categoryId: Joi.string().uuid().optional().allow(null),
    name: Joi.string().required().min(1).max(255).messages({
      "string.empty": "Name is required",
      "string.min": "Name cannot be empty",
      "string.max": "Name cannot exceed 255 characters",
      "any.required": "Name is required",
    }),
    description: Joi.string().optional().allow(null).max(1000),
    price: Joi.number().required().min(0).precision(2).messages({
      "number.base": "Price must be a number",
      "number.min": "Price cannot be negative",
      "any.required": "Price is required",
    }),
    sortOrder: Joi.number().integer().min(0).optional().default(0).allow(null),
  }).required(),
});

const updateItemSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.uuid": "Invalid product ID",
      "any.required": "Product ID is required",
    }),
  }).required(),
  body: Joi.object({
    categoryId: Joi.string().uuid().optional().allow(null),
    name: Joi.string().optional().min(1).max(255).messages({
      "string.min": "Name cannot be empty",
      "string.max": "Name cannot exceed 255 characters",
    }),
    description: Joi.string().optional().allow(null).max(1000),
    price: Joi.number().optional().min(0).precision(2).messages({
      "number.min": "Price cannot be negative",
    }),
    sortOrder: Joi.number().integer().min(0).optional(),
  }).min(1).messages({
    "object.min": "At least one field to update is required",
  }),
});

const deleteItemSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.uuid": "Invalid product ID",
      "any.required": "Product ID is required",
    }),
  }).required(),
});

const toggleItemInactiveSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.uuid": "Invalid product ID",
      "any.required": "Product ID is required",
    }),
  }).required(),
  body: Joi.object({
    isActive: Joi.boolean().required().messages({
      "boolean.base": "isActive must be a boolean",
      "any.required": "isActive is required",
    }),
  }).required(),
});

// ========== CATEGORIES ==========
const createCategorySchema = Joi.object({
  body: Joi.object({
    name: Joi.string().required().min(1).max(255).messages({
      "string.empty": "Name is required",
      "string.min": "Name cannot be empty",
      "string.max": "Name cannot exceed 255 characters",
      "any.required": "Name is required",
    }),
    sortOrder: Joi.number().integer().min(0).optional().default(0),
  }).required(),
});

const updateCategorySchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.uuid": "Invalid category ID",
      "any.required": "Category ID is required",
    }),
  }).required(),
  body: Joi.object({
    name: Joi.string().optional().min(1).max(255).messages({
      "string.min": "Name cannot be empty",
      "string.max": "Name cannot exceed 255 characters",
    }),
    sortOrder: Joi.number().integer().min(0).optional(),
  }).min(1).messages({
    "object.min": "At least one field to update is required",
  }),
});

const deleteCategorySchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.uuid": "Invalid category ID",
      "any.required": "Category ID is required",
    }),
  }).required(),
});

const toggleCategoryInactiveSchema = Joi.object({
  params: Joi.object({
    id: Joi.string().uuid().required().messages({
      "string.uuid": "Invalid category ID",
      "any.required": "Category ID is required",
    }),
  }).required(),
  body: Joi.object({
    isActive: Joi.boolean().required().messages({
      "boolean.base": "isActive must be a boolean",
      "any.required": "isActive is required",
    }),
  }).required(),
});

module.exports = {
  getCatalogueSchema,
  createItemSchema,
  updateItemSchema,
  deleteItemSchema,
  toggleItemInactiveSchema,
  createCategorySchema,
  updateCategorySchema,
  deleteCategorySchema,
  toggleCategoryInactiveSchema,
};