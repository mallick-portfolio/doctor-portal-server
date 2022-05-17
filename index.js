const express = require("express");
const app = express();
const { MongoClient, ServerApiVersion } = require("mongodb");
require("dotenv").config();

const cors = require("cors");
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

const run = async () => {
  try {
    await client.connect();
    const services = client.db("doctor-db").collection("services");

    app.get('/services', async (req, res) => {
      const query = {};
      const cursor = services.find(query);
      const result = await cursor.toArray();
      res.send(result)
    })

    app.get('/services/:category', async (req, res) => {
      const category = req.params;
      const result = await services.findOne(category);
      res.send(result)
    })


  } finally {
    // await client.close();
  }
};
run().catch(console.dir);
