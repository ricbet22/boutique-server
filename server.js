const express = require("express");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const fetch = global.fetch;

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

          // 🔐 TES NOUVELLES CLÉS (APRÈS RESET)
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

    const url =
      data?.response_body?.invoice_url ||
      data?.response_body?.redirect_url ||
      data?.response_body?.url ||
      null;

    if (!url) {
      return res.json({
        success: false,
        message: "Lien introuvable",
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
  res.send("Paiement réussi ✅");
});

/* CANCEL */
app.get("/cancel", (req, res) => {
  res.send("Paiement annulé ❌");
});

/* START */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur OK sur port", PORT);
});
