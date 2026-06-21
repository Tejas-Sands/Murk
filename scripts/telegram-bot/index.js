const TelegramBot = require('node-telegram-bot-api');
const { SuiJsonRpcClient: SuiClient, getJsonRpcFullnodeUrl } = require('@mysten/sui/jsonRpc');

// Retrieve Token from environment or fallback for demo
const token = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const bot = new TelegramBot(token, { polling: true });

const client = new SuiClient({ url: getJsonRpcFullnodeUrl('devnet'), network: 'devnet' });

console.log('Telegram Invoice Bot is running...');

bot.onText(/\/start/, (msg) => {
  bot.sendMessage(msg.chat.id, 
    "Welcome to *Murk Protocol Invoice Bot*!\n\n" +
    "Use `/status <invoice_id>` to check the status of any invoice.\n" +
    "Use `/pay <invoice_id>` to get a 1-click payment link.",
    { parse_mode: 'Markdown' }
  );
});

bot.onText(/\/status (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const invoiceId = match[1].trim();

  bot.sendMessage(chatId, `Checking invoice status for: \`${invoiceId}\`...`, { parse_mode: 'Markdown' });

  try {
    const obj = await client.getObject({
      id: invoiceId,
      options: { showContent: true }
    });

    if (!obj.data || !obj.data.content) {
      return bot.sendMessage(chatId, '❌ Invoice not found on Sui.');
    }

    const fields = obj.data.content.fields;
    const statusMap = {
      0: '⏳ Pending',
      1: '✅ Settled',
      2: '❌ Cancelled',
      3: '⏰ Expired'
    };

    const statusText = statusMap[fields.status] || 'Unknown';
    const payee = fields.payee;
    const reference = fields.reference_id || 'N/A';

    bot.sendMessage(chatId,
      `*Invoice Details*\n\n` +
      `• *ID:* \`${invoiceId}\`\n` +
      `• *Reference:* ${reference}\n` +
      `• *Status:* ${statusText}\n` +
      `• *Payee:* \`${payee}\``,
      { parse_mode: 'Markdown' }
    );

  } catch (err) {
    console.error(err);
    bot.sendMessage(chatId, '❌ Failed to fetch invoice details. Make sure the Object ID is correct.');
  }
});

bot.onText(/\/pay (.+)/, (msg, match) => {
  const chatId = msg.chat.id;
  const invoiceId = match[1].trim();
  const payUrl = `https://murk.vercel.app/pay/${invoiceId}`;

  bot.sendMessage(chatId,
    `🔗 *1-Click Payment Link*\n\n` +
    `Click below to pay or settle the invoice confidentially:\n` +
    `[Pay Invoice](${payUrl})`,
    { parse_mode: 'Markdown' }
  );
});
