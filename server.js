const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Serveur en ligne 🚀");
});

app.post("/deliver", (req, res) => {
  const { productId, email } = req.body;

  res.json({
    success: true,
    message: "Commande reçue",
    productId,
    email
  });
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur lancé sur port", PORT);
});