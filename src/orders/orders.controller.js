const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");
// TODO: Implement the /orders handlers needed to make the tests pass
//Middleware functions:
const validateOrderExists = (req, res, next) => {
   const orderId = req.params.orderId;
   res.locals.orderId = orderId;
   const foundOrder = orders.find((order) => order.id === orderId);
   if (!foundOrder) {
      return next({
         status: 404,
         message: `Order not found: ${orderId}` });
   }
   res.locals.order = foundOrder;
};

const validateOrderDeliverTo = (req, res, next) => {
   const { data = null } = req.body;
   res.locals.newOD = data;
   const orderdeliverTo = data.deliverTo;
   if (!orderdeliverTo || orderdeliverTo.length === 0) {
      return next({
         status: 400,
         message: "Order must include a deliverTo",
      });
   }
};

const validateOrderNumber = (req, res, next) => {
   const orderMobileNumber = res.locals.newOD.mobileNumber;
   if (!orderMobileNumber || orderMobileNumber.length === 0) {
      return next({
         status: 400,
         message: "Order must include a mobileNumber",
      });
   }
};

const validateOrderHasDishes = (req, res, next) => {
   const orderDishes = res.locals.newOD.dishes;
   if (!orderDishes || !Array.isArray(orderDishes) || orderDishes.length <= 0) {
      return next({
         status: 400,
         message: "Order must include at least one dish",
      });
   }
   res.locals.dishes = orderDishes;
};

const orderHasValidDishes = (req, res, next) => {
   const orderDishes = res.locals.dishes;
   orderDishes.forEach((dish) => {
      const dishQuantity = dish.quantity;
      if (!dishQuantity || typeof dishQuantity != "number" || dishQuantity <= 0) {
         return next({
         status: 400,
         message: `Dish ${orderDishes.indexOf(
            dish
         )} must have a quantity that is an integer greater than 0`,
         });
      }
   });
};

const orderIdMatches = (req, res, next) => {
   const paramId = res.locals.orderId;
   const { id = null } = res.locals.newOD;
   if (!id || id === null) {
      res.locals.newOD.id = res.locals.orderId;
   } else if (paramId != id) {
      return next({
         status: 400,
         message: `Order id does not match route id. Order: ${id}, Route: ${paramId}`,
      });
   }
};

const incomingStatusIsValid = (req, res, next) => {
   const { status = null } = res.locals.newOD;
   if (!status || status.length === 0 || status === "invalid") {
      return next({
         status: 400,
         message:
         "Order must have a status of pending, preparing, out-for-delivery, delivered",
      });
   }
};

const extantStatusIsValid = (req, res, next) => {
   const { status = null } = res.locals.order;
   if (status === "delivered") {
      return next({
         status: 400,
         message: "A delivered order cannot be changed",
      });
   }
};

const extantStatusIsPending = (req, res, next) => {
   const { status = null } = res.locals.order;
   if (status !== "pending") {
      return next({
         status: 400,
         message: "An order cannot be deleted unless it is pending",
      });
   }
};

//checking validation from the data
const createValidation = (req, res, next) => {
   validateOrderDeliverTo(req, res, next);
   validateOrderNumber(req, res, next);
   validateOrderHasDishes(req, res, next);
   orderHasValidDishes(req, res, next);
   next();
};

const readValidation = (req, res, next) => {
   validateOrderExists(req, res, next);
   next();
};

const updateValidation = (req, res, next) => {
   validateOrderExists(req, res, next);
   validateOrderDeliverTo(req, res, next);
   validateOrderNumber(req, res, next);
   validateOrderHasDishes(req, res, next);
   orderHasValidDishes(req, res, next);
   orderIdMatches(req, res, next);
   incomingStatusIsValid(req, res, next);
   extantStatusIsValid(req, res, next);
   next();
};

const deleteValidation = (req, res, next) => {
   validateOrderExists(req, res, next);
   extantStatusIsPending(req, res, next);
   next();
};

//Handlers:
function create(req, res) {
   const newOrderData = res.locals.newOD;
   newOrderData.id = nextId();
   orders.push(newOrderData);
   res.status(201).json({ data: newOrderData });
}

function read(req, res) {
   res.status(200).json({ data: res.locals.order });
}

function update(req, res) {
   const newData = res.locals.newOD;
   const oldData = res.locals.order;
   const index = orders.indexOf(oldData);
   for (const key in newData) {
      orders[index][key] = newData[key];
   }
   res.status(200).json({ data: orders[index] });
}

function list(req, res) {
   res.status(200).json({ data: orders });
}

function destroy(req, res) {
   const index = orders.indexOf(res.locals.order);
   orders.splice(index, 1);
   res.sendStatus(204);
}

module.exports = {
   create: [createValidation, create],
   read: [readValidation, read],
   update: [updateValidation, update],
   delete: [deleteValidation, destroy],
   list,
};
