const express = require("express");
const cors = require("cors");
const fetch = require("node-fetch");

const app = express();

app.use(cors());
app.use(express.json());

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

          // 🔑 CLÉS TEST
          "PAYDUNYA-MASTER-KEY": "XBaD1Tp1-tkLh-NJsZ-9hMs-KUftcQJaF0Uu",
          "PAYDUNYA-PRIVATE-KEY": "test_private_gNQct9nCI7pnbrc729yrbycToXy",
          "PAYDUNYA-TOKEN": "drEst4SJNfYkgGx3gRDx",

          // 🔥 IMPORTANT
          "PAYDUNYA-MODE": "test"
        },
        body: JSON.stringify({
          invoice: {
            items: [
              {
                name: "Produit RIC MARKET",
                quantity: 1,
                unit_price: amount,
                total_price: amount
              }
            ],
            total_amount: amount,
            description: "Achat RIC MARKET"
          },
          store: {
            name: "RIC MARKET"
          },
          actions: {
            return_url: "https://boutique-server-1-wz16.onrender.com/success",
            cancel_url: "https://boutique-server-1-wz16.onrender.com/cancel",
            callback_url: "https://boutique-server-1-wz16.onrender.com/callback"
          }
        })
      }
    );

    const data = await response.json();

    // ✅ LOG COMPLET (TRÈS IMPORTANT)
    console.log("========== PAYDUNYA RESPONSE ==========");
    console.log(JSON.stringify(data, null, 2));
    console.log("======================================");

    if (!response.ok) {
      return res.json({
        success: false,
        message: data.response_text || "Erreur API PayDunya",
        debug: data
      });
    }

    const url =
      data?.response_body?.invoice_url ||
      data?.response_body?.redirect_url ||
      null;

    if (!url) {
      return res.json({
        success: false,
        message: "Lien paiement non généré",
        debug: data
      });
    }

    res.json({ success: true, url });

  } catch (err) {

    console.error("ERREUR SERVEUR:", err);

    res.json({
      success: false,
      message: "Erreur serveur",
      error: err.message
    });
  }
});

/* CALLBACK */
app.get("/callback", (req, res) => {
  console.log("✅ Paiement confirmé (callback)");
  res.send("OK");
});

/* SUCCESS */
app.get("/success", (req, res) => {
  res.send("✅ Paiement réussi");
});

/* CANCEL */
app.get("/cancel", (req, res) => {
  res.send("❌ Paiement annulé");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log("Serveur lancé sur", PORT);
});
