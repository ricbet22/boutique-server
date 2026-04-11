const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

/* =========================
   HOME
========================= */
app.get("/", (req, res) => {
  res.send("Serveur en ligne 🚀");
});

/* =========================
   ANCIEN SYSTÈME (DOWNLOAD / DELIVERY)
========================= */
app.post("/deliver", (req, res) => {
  const { productId, email } = req.body;

  res.json({
    success: true,
    message: "Commande reçue",
    productId,
    email
  });
});

/* =========================
   PAYDUNYA PAYMENT
========================= */
app.post("/create-payment", async (req, res) => {
  const { amount } = req.body;

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

    if (data.response_code === "00") {
      res.json({ url: data.response_text });
    } else {
      res.json({
        error: true,
        message: "Erreur PayDunya",
        details: data
      });
    }
  } catch (err) {
    res.json({
      error: true,
      message: "Erreur serveur",
      details: err.message
    });
  }
});

/* =========================
   SUCCESS PAGE
========================= */
app.get("/success", (req, res) => {
  res.send(`
    <h1 style="color:green;">✅ Paiement réussi</h1>
    <p>Votre paiement a été effectué avec succès.</p>
    <p>Veuillez nous contacter sur WhatsApp pour recevoir votre produit.</p>
    <a href="https://wa.me/message/HVCPBAQEWB5PD1">📩 Contacter WhatsApp</a>
  `);
});

/* =========================
   CANCEL PAGE
========================= */
app.get("/cancel", (req, res) => {
  res.send(`
    <h1 style="color:red;">❌ Paiement annulé</h1>
    <p>Le paiement a échoué ou a été annulé.</p>
    <a href="/">🔁 Retour au site</a>
  `);
});

/* =========================
   START SERVER
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur lancé sur port", PORT);
});
