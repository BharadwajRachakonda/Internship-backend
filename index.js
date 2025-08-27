// API Structure
// /user:username -> get, post, delete
// /items -> get
// /items/:id -> get
// /cart -> get, delete, put

require("dotenv").config();
const { connectDB } = require("./db/connect");
connectDB();
const express = require("express");
const app = express();
const session = require("express-session");
const JWT = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
var cors = require("cors");
const PORT = process.env.PORT || 4000;
const { Item, User, Cart } = require("./db/collections");

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  cors({
    origin: ["http://localhost:3000", "https://pizza-six-alpha.vercel.app"],
    credentials: true,
  })
);

// ✅ Session config
app.use(
  session({
    secret: process.env.SESSION_SECRET || "default_secret",
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production", // ✅ required for HTTPS
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax", // ✅ allow cross-site cookies
    },
  })
);

app.use("/cart", (req, res, next) => {
  if (req.session.JWT && JWT.verify(req.session.JWT, process.env.JWT_SECRET)) {
    req.user_id = JWT.decode(req.session.JWT, process.env.JWT_SECRET).id;
    next();
  } else {
    res.status(401).json({ error: "Unauthorized" });
  }
});

// get user details given username in url and password in body
app.put("/user/:username", async (req, res) => {
  try {
    if (req.session.JWT) {
      const decoded = JWT.verify(req.session.JWT, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id).select("name");
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      return res.json({ name: user.name });
    } else {
      const username = req.params.username;
      const user = await User.findOne({ name: username });
      const result = await bcrypt.compare(req.body.password, user.password);
      if (result) {
        const token = JWT.sign({ id: user._id }, process.env.JWT_SECRET, {
          expiresIn: "1h",
        });
        req.session.JWT = token;
        res.status(201).json({ name: user.name });
      } else {
        throw new Error("Credentials do not match");
      }
    }
  } catch (error) {
    if (error.message === "Credentials do not match") {
      res.status(401).json({ error: error.message });
    } else {
      res.status(401).json({ error: "Unknown Error" });
    }
    console.error(error);
  }
});

// create new user and return them
app.post("/user/:username", async (req, res) => {
  try {
    const username = req.params.username;
    const { password } = req.body;
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const _user = await User.findOne({ name: username });
    if (_user) {
      return res.status(400).json({ error: "Username in use" });
    }
    const user = new User({ name: username, password: hashedPassword });
    await user.save();
    req.session.JWT = JWT.sign({ id: user._id }, process.env.JWT_SECRET, {
      expiresIn: "1h",
    });
    res.status(201).json({ name: user.name });
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.error(error);
  }
});

// logout
app.delete("/user/:username", async (req, res) => {
  req.session.destroy();
  res.status(200).json({ message: "Logged out successfully" });
});

// get all items
app.get("/items", async (req, res) => {
  try {
    const items = await Item.find();
    res.json(items);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// get item details given item id
app.get("/items/:id", async (req, res) => {
  try {
    const item = await Item.findById(req.params.id);
    if (!item) {
      return res.status(404).json({ error: "Item not found" });
    }
    res.json(item);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.error(error);
  }
});

// get cart details for logged in user
app.get("/cart", async (req, res) => {
  try {
    const user = await User.findById(req.user_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    const cart = await Cart.findOne({ user: user._id }).populate("items._id");
    if (!cart) {
      return res.status(200).json([]);
    }
    res.json(cart.items);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
  }
});

// delete cart
app.delete("/cart", async (req, res) => {
  try {
    const user = await User.findById(req.user_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    await Cart.deleteOne({ user: user._id });
    res.status(204).json([]);
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.error(error);
  }
});

// decrement cart item count by one if the count goes below one delete the item.
app.put("/cart", async (req, res) => {
  try {
    const user = await User.findById(req.user_id);
    if (!user) {
      return res.status(404).json({ error: "User not found" });
    }
    let cart = await Cart.findOne({ user: user._id });
    if (!cart) {
      cart = new Cart({ user: user._id, items: [] });
    }
    cart.items = req.body.items;
    await cart.save();
    res.status(200).json(cart.items); // ✅ use 200 instead of 204
  } catch (error) {
    res.status(500).json({ error: "Internal server error" });
    console.error(error);
  }
});

app.get("/hasSession", (req, res) => {
  if (req.session && req.session.JWT) {
    return res.status(200).json({ hasSession: true });
  }
  res.status(200).json({ hasSession: false });
});

app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});

module.exports = app;
