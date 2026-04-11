const express = require("express");
const fetch = require("node-fetch"); // 👈 AJOUT

const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Serveur en ligne 🚀");
});

// 👉 ANCIEN SYSTÈME (on garde)
app.post("/deliver", (req, res) => {
  const { productId, email } = req.body;

  res.json({
    success: true,
    message: "Commande reçue",
    productId,
    email
  });
});

// 🚀 NOUVELLE ROUTE PAYDUNYA
app.post("/create-payment", async (req, res) => {
  const { amount, email } = req.body;

  try {
    const response = await fetch("https://app.paydunya.com/api/v1/checkout-invoice/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "PAYDUNYA-MASTER-KEY": "XBaD1Tp1-tkLh-NJsZ-9hMs-KUftcQJaF0Uu",
        "PAYDUNYA-PRIVATE-KEY": "live_private_v5yajGIXmycMXPcInGW74WZJODD",
        "PAYDUNYA-TOKEN": "cghAMMjHpWPltNO7TlOZ"
      },
      body: JSON.stringify({
        invoice: {
          total_amount: amount,
          description: "Achat produit RIC MARKET"
        },
        store: {
          name: "RIC MARKET"
        },
        actions: {
          callback_url: "https://boutique-server-1-wz16.onrender.com/success",
          cancel_url: "https://boutique-server-1-wz16.onrender.com/cancel"
        }
      })
    });

    const data = await response.json();

    if (data.response_code === "00") {
      res.json({ url: data.response_text });
    } else {
      res.json({ error: "Erreur PayDunya" });
    }

  } catch (err) {
    res.json({ error: "Erreur serveur" });
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur lancé sur port", PORT);
});
