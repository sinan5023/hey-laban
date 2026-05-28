const express = require('express')
const router = express.Router()


//validator
const validate = require("../middlewares/validate.middleware");

//Middlewares
const authMiddleware = require("../middlewares/auth.middleware");
const salesSessionMiddleware = require("../middlewares/salesSession.middleware");
//API Validators
const {searchTicketsSchema} = require("../validators/order.search.validation")
// Controllers 
const searchController = require("../controller/orders.kot.search.controller");



router.get("/tickets",authMiddleware,salesSessionMiddleware,validate(searchTicketsSchema),searchController.searchTicketsHandler)




module.exports= router
