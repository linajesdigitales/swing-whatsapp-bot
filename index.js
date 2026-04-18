const express = require('express');
const axios = require('axios');
const app = express();
app.use(express.json());

const VERIFY_TOKEN = process.env.VERIFY_TOKEN || 'swingparfum2024';

app.get('/webhook', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];
  if (mode === 'subscribe' && token === VERIFY_TOKEN) {
    res.status(200).send(challenge);
  } else {
    res.sendStatus(403);
  }
});

app.post('/webhook', async (req, res) => {
  try {
    const entry = req.body.entry?.[0];
    const change = entry?.changes?.[0];
    const message = change?.value?.messages?.[0];
    if (message?.type === 'text') {
      const userText = message.text.body;
      const phoneNumber = message.from;
      const claudeReply = await askClaude(userText);
      await sendWhatsAppMessage(phoneNumber, claudeReply);
    }
  } catch (err) {
    console.error('Error:', err.message);
  }
  res.sendStatus(200);
});

async function askClaude(userMessage) {
  const response = await axios.post(
    'https://api.anthropic.com/v1/messages',
    {
      model: 'claude-sonnet-4-20250514',
      max_tokens: 500,
      system: `Eres un asistente de ventas de Swing Parfum, una tienda de perfumes.
Tu objetivo es:
1. Responder preguntas sobre productos y disponibilidad
2. Ayudar al cliente a elegir el perfume ideal
3. Confirmar pedidos solicitando: nombre completo, dirección de entrega y método de pago
4. Cerrar ventas de forma amable y profesional
Responde siempre en español, de forma breve y conversacional (máximo 3 líneas).`,
      messages: [{ role: 'user', content: userMessage }]
    },
    {
      headers: {
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
        'Content-Type': 'application/json'
      }
    }
  );
  return response.data.content[0].text;
}

async function sendWhatsAppMessage(to, text) {
  await axios.post(
    `https://graph.facebook.com/v18.0/${process.env.PHONE_NUMBER_ID}/messages`,
    {
      messaging_product: 'whatsapp',
      to: to,
      type: 'text',
      text: { body: text }
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_TOKEN}`,
        'Content-Type': 'application/json'
      }
    }
  );
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor corriendo en puerto ${PORT}`));
