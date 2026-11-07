
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");

const app = express();

app.use(express.json());

const PORT = process.env.PORT || 3000;

const CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
const CLIENT_SECRET = process.env.PAYPAL_CLIENT_SECRET;

const PAYPAL_API = "https://api-m.paypal.com";

// ===================================
// CONFIGURATION CORS
// ===================================

const allowedOrigins = (process.env.FRONTEND_ORIGIN || "")
  .split(",")
  .map(origin => origin.trim())
  .filter(Boolean);

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.length === 0 ||
        allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    return callback(new Error("Origine non autorisée"));
  },
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
}));

// ===================================
// PRODUITS ET PRIX
// ===================================

const products = {
  "26800": {
    name: "Compte Blox Fruit niveau 2800",
    price: "45.55"
  },

  "17700": {
    name: "Compte Roblox niveau 3000",
    price: "30.00"
  },

  "14700": {
    name: "Compte Roblox niveau 1940",
    price: "25.00"
  },

  "17701": {
    name: "5000 Robux",
    price: "30.00"
  },

  "5900": {
    name: "1000 Robux",
    price: "10.00"
  }
};

// ===================================
// VÉRIFICATION DE CONFIGURATION
// ===================================

function checkConfig() {
  if (!CLIENT_ID || !CLIENT_SECRET) {
    throw new Error("Identifiants PayPal manquants.");
  }
}

// ===================================
// AUTHENTIFICATION PAYPAL
// ===================================

let cachedToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  checkConfig();

  if (cachedToken && Date.now() < tokenExpiresAt) {
    return cachedToken;
  }

  const credentials = Buffer
    .from(`${CLIENT_ID}:${CLIENT_SECRET}`)
    .toString("base64");

  const response = await fetch(
    `${PAYPAL_API}/v1/oauth2/token`,
    {
      method: "POST",
      headers: {
        "Authorization": `Basic ${credentials}`,
        "Content-Type": "application/x-www-form-urlencoded"
      },
      body: "grant_type=client_credentials"
    }
  );

  const data = await response.json();

  if (!response.ok || !data.access_token) {
    console.error("Erreur authentification PayPal:", data);
    throw new Error("Impossible de se connecter à PayPal.");
  }

  cachedToken = data.access_token;

  tokenExpiresAt = Date.now() +
    ((data.expires_in || 300) - 60) * 1000;

  return cachedToken;
}

// ===================================
// APPEL API PAYPAL
// ===================================

async function paypalRequest(endpoint, method, body = null, requestId = null) {
  const token = await getAccessToken();

  const headers = {
    "Authorization": `Bearer ${token}`,
    "Content-Type": "application/json"
  };

  if (requestId) {
    headers["PayPal-Request-Id"] = requestId;
  }

  const response = await fetch(
    `${PAYPAL_API}${endpoint}`,
    {
      method,
      headers,
      ...(body ? { body: JSON.stringify(body) } : {})
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Erreur API PayPal:", data);

    const error = new Error("Erreur lors du traitement PayPal.");
    error.status = response.status;
    throw error;
  }

  return data;
}

// ===================================
// PAGE DE TEST DU SERVEUR
// ===================================

app.get("/", (req, res) => {
  res.json({
    status: "online",
    message: "BLOX MARKET - Serveur PayPal opérationnel",
    payment: "PayPal Live"
  });
});

// ===================================
// CONFIGURATION DU SDK PAYPAL
// ===================================

app.get("/api/paypal/config", (req, res) => {
  if (!CLIENT_ID) {
    return res.status(500).json({
      error: "Client ID manquant."
    });
  }

  res.json({
    clientId: CLIENT_ID,
    currency: "USD"
  });
});

// ===================================
// CRÉATION D'UNE COMMANDE
// ===================================

app.post("/api/paypal/create-order", async (req, res) => {
  try {
    const { productId } = req.body;

    const product = products[String(productId)];

    if (!product) {
      return res.status(400).json({
        error: "Produit inconnu."
      });
    }

    const order = await paypalRequest(
      "/v2/checkout/orders",
      "POST",
      {
        intent: "CAPTURE",

        purchase_units: [
          {
            reference_id: String(productId),
            custom_id: String(productId),

            description: product.name,

            amount: {
              currency_code: "USD",
              value: product.price
            }
          }
        ],

        application_context: {
          brand_name: "BLOX MARKET",
          user_action: "PAY_NOW"
        }
      },
      crypto.randomUUID()
    );

    res.json({
      id: order.id
    });

  } catch (error) {
    console.error("Création commande:", error);

    res.status(500).json({
      error: "Impossible de créer la commande PayPal."
    });
  }
});

// ===================================
// CAPTURE ET VÉRIFICATION DU PAIEMENT
// ===================================

app.post("/api/paypal/capture-order", async (req, res) => {
  try {
    const { orderID } = req.body;

    if (
      typeof orderID !== "string" ||
      !/^[A-Z0-9-]{10,50}$/i.test(orderID)
    ) {
      return res.status(400).json({
        error: "Identifiant de commande invalide."
      });
    }

    // Récupérer la commande auprès de PayPal
    const order = await paypalRequest(
      `/v2/checkout/orders/${encodeURIComponent(orderID)}`,
      "GET"
    );

    const purchaseUnit = order.purchase_units?.[0];

    if (!purchaseUnit) {
      return res.status(400).json({
        error: "Commande invalide."
      });
    }

    const product = products[String(purchaseUnit.custom_id)];

    // Vérifier le produit et le montant réel
    if (
      !product ||
      purchaseUnit.reference_id !== purchaseUnit.custom_id ||
      purchaseUnit.amount?.currency_code !== "USD" ||
      purchaseUnit.amount?.value !== product.price
    ) {
      return res.status(400).json({
        error: "Les informations de paiement ne correspondent pas."
      });
    }

    // Empêcher une seconde capture
    if (order.status === "COMPLETED") {
      return res.json({
        success: true,
        status: "COMPLETED",
        product: product.name,
        amount: product.price,
        currency: "USD",
        message: "Paiement déjà confirmé."
      });
    }

    if (order.status !== "APPROVED") {
      return res.status(400).json({
        error: "La commande n'a pas été approuvée par le client."
      });
    }

    // Capturer le paiement
    const capture = await paypalRequest(
      `/v2/checkout/orders/${encodeURIComponent(orderID)}/capture`,
      "POST",
      {},
      `capture-${orderID}`
    );

    if (capture.status !== "COMPLETED") {
      return res.status(400).json({
        success: false,
        status: capture.status,
        message: "Le paiement n'est pas encore confirmé."
      });
    }

    const captureDetails =
      capture.purchase_units?.[0]?.payments?.captures?.[0];

    if (
      !captureDetails ||
      captureDetails.status !== "COMPLETED" ||
      captureDetails.amount?.currency_code !== "USD" ||
      captureDetails.amount?.value !== product.price
    ) {
      return res.status(400).json({
        success: false,
        error: "La capture du paiement n'a pas pu être validée."
      });
    }

    res.json({
      success: true,
      status: "COMPLETED",
      transactionId: captureDetails.id,
      product: product.name,
      amount: product.price,
      currency: "USD",
      message: "Paiement confirmé avec succès."
    });

  } catch (error) {
    console.error("Capture paiement:", error);

    res.status(500).json({
      error: "Impossible de confirmer le paiement."
    });
  }
});

// ===================================
// GESTION DES ERREURS
// ===================================

app.use((err, req, res, next) => {
  console.error("Erreur serveur:", err.message);

  res.status(500).json({
    error: "Une erreur interne est survenue."
  });
});

// ===================================
// DÉMARRAGE DU SERVEUR
// ===================================

app.listen(PORT, () => {
  console.log(`BLOX MARKET démarré sur le port ${PORT}`);
});
      
