const Schema = require("mongoose").Schema;
const mongoose = require("mongoose");

const item = new Schema({
  name: { type: String, required: true },
  cost: { type: Number, required: true },
  description: { type: String, required: true },
  imageURL: { type: String, required: true },
});

const user = new Schema({
  name: { type: String, required: true },
  password: { type: String, required: true },
});

const cart = new Schema({
  user: { type: Schema.Types.ObjectId, ref: "user", require: true },
  items: [
    {
      _id: { type: Schema.Types.ObjectId, ref: "item" },
      count: { type: Number, required: true },
    },
  ],
});

const Item = mongoose.model("item", item);
const User = mongoose.model("user", user);
const Cart = mongoose.model("cart", cart);

module.exports = { Item, User, Cart };
