const express = require("express");
const fetch = require("node-fetch");

const app = express();
app.use(express.json());

/* =========================
   HOME
========================= */
app.get("/", (req, res) => {
  res.send("Serveur PayDunya en ligne 🚀");
});

/* =========================
   DELIVERY TEST
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
   CREATE PAYMENT PAYDUNYA
========================= */
app.post("/create-payment", async (req, res) => {
  const { amount } = req.body;

  if (!amount || amount <= 0) {
    return res.json({
      error: true,
      message: "Montant invalide"
    });
  }

  try {
    const response = await fetch(
      "https://app.paydunya.com/api/v1/checkout-invoice/create",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "PAYDUNYA-MASTER-KEY": "XBaD1Tp1-tkLh-NJsZ-9hMs-KUftcQJaF0Uu",
          "PAYDUNYA-PRIVATE-KEY": "test_private_MspMDfUtSsvO54UVz8H7NO90VR9",
          "PAYDUNYA-TOKEN": "DTip2Kv4kRy9rtBpi7Bz"
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

    // 🔥 IMPORTANT: gérer tous les cas possibles
    const paymentUrl =
      data.response_text ||
      data.invoice_url ||
      data.url ||
      null;

    if (data.response_code === "00" && paymentUrl) {
      return res.json({
        success: true,
        url: paymentUrl
      });
    }

    return res.json({
      success: false,
      message: "Erreur PayDunya",
      details: data
    });

  } catch (err) {
    return res.json({
      success: false,
      message: "Erreur serveur",
      error: err.message
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
    <p>Contactez-nous sur WhatsApp pour recevoir votre produit.</p>
    <a href="https://wa.me/message/HVCPBAQEWB5PD1">WhatsApp</a>
  `);
});

/* =========================
   CANCEL PAGE
========================= */
app.get("/cancel", (req, res) => {
  res.send(`
    <h1 style="color:red;">❌ Paiement échoué ou annulé</h1>
    <a href="/">Retour au site</a>
  `);
});

/* =========================
   START
========================= */
const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur lancé sur port", PORT);
});
