const express = require("express");
const app = express();
const cors = require("cors");
require("dotenv").config();
const { MongoClient } = require("mongodb");
const ObjectId = require("mongodb").ObjectId;
const admin = require("firebase-admin");
const port = process.env.PORT || 5000;

const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
//middleware
app.use(cors());
app.use(express.json());

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.072tx.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function verifyToken(req, res, next) {
  if (req.headers?.authorization?.startsWith("Bearer ")) {
    const token = req.headers.authorization.split(" ")[1];
    try {
      const decodedUser = await admin.auth().verifyIdToken(token);
      req.decodedEmail = decodedUser.email;
    } catch {}
  }
  next();
}

async function run() {
  try {
    await client.connect();
    const database = client.db("automan-car");
    const featuresCollection = database.collection("features");
    const servicesCollection = database.collection("services");
    const purchaseCollection = database.collection("purchase");
    const reviewsCollection = database.collection("reviews");
    const usersCollection = database.collection("users");
    //FEATURES GET API
    app.get("/features", async (req, res) => {
      const cursor = featuresCollection.find({});
      const features = await cursor.toArray();
      res.json(features);
    });
    //service POST API
    app.post("/services", async (req, res) => {
      const service = req.body;

      const result = await servicesCollection.insertOne(service);
      res.json(result);
    });
    //SERVICES GET API
    app.get("/services", async (req, res) => {
      const cursor = servicesCollection.find({});
      const services = await cursor.toArray();
      res.json(services);
    });
    //SERVICES DELETE API
    app.delete("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await servicesCollection.deleteOne(query);
      res.json(result);
    });
    //SERVICES with ID GET API
    app.get("/services/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await servicesCollection.findOne(query);
      res.json(result);
    });
    //ORDER GET API
    app.get("/orders", async (req, res) => {
      const email = req.query.email;
      const query = { email };

      const cursor = purchaseCollection.find(query);
      const result = await cursor.toArray();

      res.json(result);
    });
    //ORDER GET API
    app.get("/allorders", async (req, res) => {
      const cursor = purchaseCollection.find({});
      const result = await cursor.toArray();
      res.json(result);
    });
    //PURCHASE POST API
    app.post("/purchase", async (req, res) => {
      const purchase = req.body;
      const result = await purchaseCollection.insertOne(purchase);
      // console.log(purchase);
      res.json(result);
    });
    //ORDER DELETE API
    app.delete("/orders/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await purchaseCollection.deleteOne(query);
      res.json(result);
    });
    //REVIEWS GET API
    app.get("/reviews", async (req, res) => {
      const cursor = reviewsCollection.find({});
      const reviews = await cursor.toArray();
      res.json(reviews);
    });
    //REVIEWS POST API
    app.post("/reviews", async (req, res) => {
      const purchase = req.body;
      const result = await reviewsCollection.insertOne(purchase);
      // console.log(purchase);
      res.json(result);
    });
    //USERS POST API
    app.post("/users", async (req, res) => {
      const user = req.body;
      const result = await usersCollection.insertOne(user);
      res.json(result);
    });
    //ADMIN PUT API
    app.put("/users/admin", verifyToken, async (req, res) => {
      const user = req.body;
      const requester = req.decodedEmail;
      if (requester) {
        const requesterAccount = await usersCollection.findOne({
          email: requester,
        });
        if (requesterAccount.role === "admin") {
          const filter = { email: user.email };
          const updateDoc = { $set: { role: "admin" } };
          const result = await usersCollection.updateOne(filter, updateDoc);
          res.json(result);
        }
      } else {
        res
          .status(403)
          .json({ message: "you do not have access to make admin" });
      }
    });
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      let isAdmin = false;
      if (user?.role === "admin") {
        isAdmin = true;
      }
      res.json({ admin: isAdmin });
    });
    //UPDATE Status
    app.put("/admin/allorders/:id", async (req, res) => {
      const id = req.params.id;

      const filter = { _id: ObjectId(id) };
      console.log(filter);
      const options = { upsert: true };
      const updateDoc = {
        $set: {
          status: "shipping",
        },
      };
      const result = await purchaseCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.json(result);
    });
  } finally {
    // await client.close();
  }
}
run().catch(console.dir);
app.get("/", (req, res) => {
  res.send("car sale running");
});
app.listen(port, () => {
  console.log("listening to port", port);
});
