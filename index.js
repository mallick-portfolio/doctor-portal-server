const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();
var jwt = require("jsonwebtoken");
const cors = require("cors");
const verify = require("jsonwebtoken/verify");
const { use } = require("express/lib/router");
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());

app.get("/", (req, res) => res.send("Hello World!"));
app.listen(port, () => console.log(`Example app listening on port ${port}!`));

const uri = `mongodb+srv://${process.env.DB_NAME}:${process.env.DB_PASS}@cluster0.cmrrh.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

const varifyJwt = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).send({ message: "UnAuthorized access" });
  }
  const token = authHeader.split(" ")[1];
  jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    req.decoded = decoded;
    next();
  });
};

const run = async () => {
  try {
    await client.connect();
    const serviceCollection = client.db("doctor-portal").collection("services");
    const bookingCollection = client.db("doctor-portal").collection("booking");
    const userCollection = client.db("doctor-portal").collection("users");

    // add or update user

    app.put("/users/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;
      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const token = jwt.sign({ email: email }, process.env.ACCESS_TOKEN, {
        expiresIn: "1d",
      });
      const result = await userCollection.updateOne(filter, updateDoc, options);

      res.send({ result, token });
    });
    // add or update user

    app.put("/users/admin/:email", async (req, res) => {
      const email = req.params.email;
      const filter = { email: email };
      const updateDoc = {
        $set: { role: "admin" },
      };

      const result = await userCollection.updateOne(filter, updateDoc);

      res.send(result);
    });
    app.get('/users', varifyJwt, async (req, res) => {
      const result = await userCollection.find().toArray()
      res.send(result)
    })
    app.get('/users/admin/:email',varifyJwt, async (req, res) => {
      const email = req.params.email;
      console.log(email)
      const varifyEmail = req.decoded.email;
      let user
      if(email === varifyEmail){
         user =await userCollection.findOne({email: email})
         
      }
      const admin = user.role === 'admin'
      console.log(admin)
      res.send({role: admin})
    })



    app.get("/services", async (req, res) => {
      const query = {};
      const cursor = serviceCollection.find(query);
      const result = await cursor.toArray();
      res.send(result);
    });
    // load all booking
    app.get("/booking", varifyJwt, async (req, res) => {
      const email = req.decoded.email;
      const patient = req.query.patient;
      if (email === patient) {
        const query = { patient: patient };
        const result = await bookingCollection.find(query).toArray();
        res.send(result);
      } else {
        res.status(401).send({ message: "unauthorization" });
      }
    });

    // add booking
    app.post("/booking", async (req, res) => {
      const data = req.body;
      const query = { name: data.name, date: data.date, patient: data.patient };
      const exists = await bookingCollection.findOne(query);
      if (exists) {
        return res.send({ success: false, booking: exists });
      } else {
        const result = await bookingCollection.insertOne(data);
        res.send({ success: true, result });
      }
    });

    app.get("/available", async (req, res) => {
      const date = req.params.date;
      const allservice = await serviceCollection.find().toArray();
      const query = { date: date };
      const allBooking = await bookingCollection.find(query).toArray();

      allservice.forEach((service) => {
        const serviceBookings = allBooking.filter(
          (b) => b.name === service.name
        );
        const booked = serviceBookings.map((s) => s.time);
        const available = service.slots.filter((s) => !booked.includes(s));
        service.available = available;
      });

      res.send(allservice);
    });
  } finally {
    // await client.close();
  }
};
run().catch(console.dir);
