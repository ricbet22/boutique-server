const express = require("express");
const fetch = require("node-fetch");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

/* HOME */
app.get("/", (req, res) => {
  res.send("Serveur PayDunya OK 🚀");
});

/* CREATE PAYMENT */
app.post("/create-payment", async (req, res) => {

  const amount = Number(req.body.amount);

  if (!amount || amount <= 0) {
    return res.json({ success: false, message: "Montant invalide" });
  }

  try {

    const response = await fetch(
      "https://app.paydunya.com/api/v1/checkout-invoice/create",
      {
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
            return_url: "https://boutique-server-1-wz16.onrender.com/success",
            cancel_url: "https://boutique-server-1-wz16.onrender.com/cancel"
          }
        })
      }
    );

    const data = await response.json();

    console.log("PAYDUNYA RESPONSE:", data);

    const url =
      data?.response_body?.invoice_url ||
      data?.response_body?.redirect_url ||
      data?.response_body?.url ||
      data?.response_text ||
      null;

    if (!url) {
      return res.json({
        success: false,
        message: "Lien paiement introuvable",
        debug: data
      });
    }

    return res.json({
      success: true,
      url
    });

  } catch (err) {
    return res.json({
      success: false,
      message: "Erreur serveur PayDunya",
      error: err.message
    });
  }
});

/* SUCCESS */
app.get("/success", (req, res) => {
  res.send(`
    <h1 style="color:green;">✅ Paiement réussi</h1>
    <a href="/">Retour site</a>
  `);
});

/* CANCEL */
app.get("/cancel", (req, res) => {
  res.send(`
    <h1 style="color:red;">❌ Paiement annulé</h1>
    <a href="/">Retour</a>
  `);
});

/* START */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur OK sur port", PORT);
});
