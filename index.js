const {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
} = require("discord.js");

// ==========================================
// ⚙️ CONFIGURATION
// ==========================================
const TOKEN = process.env.TOKEN; 
const ADMIN_PASS = process.env.ADMIN_PASS; 
const WORKER_URL = "https://script-api.hackgpo59.workers.dev";

const GUILD_ID = "1484337235003179078";
const CUSTOMER_ROLE_ID = "1485555230711222332";
const NOT_BUYER_ROLE_ID = "1485555042856603749";

const EXPIRY_WARNING_THRESHOLD = 24 * 60 * 60 * 1000;

const userWhitelist = new Map();
const notifiedUsers = new Set();

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMembers,
  ],
});

// ==========================================
// 🌐 API FETCH FUNCTION
// ==========================================
async function fetchWorker(action, params = {}) {
  const query = new URLSearchParams({
    pass: ADMIN_PASS,
    action: action,
    ...params,
  }).toString();
  try {
    const res = await fetch(`${WORKER_URL}/admin?${query}`, {
      headers: { "User-Agent": "Mozilla/5.0", Accept: "application/json" },
    });
    return await res.json();
  } catch (e) {
    console.error("❌ Lỗi khi fetch API:", e);
    return null;
  }
}

// ==========================================
// 🚀 BOOT & BACKGROUND TASKS
// ==========================================
client.once("ready", async () => {
  console.log(`✅ Enterprise Security Bot Online: ${client.user.tag}`);
  client.user.setActivity("System Security", { type: 3 });

  // 1. ĐỒNG BỘ DỮ LIỆU TỪ CLOUDFLARE KHI KHỞI ĐỘNG
  console.log("🔄 Đang đồng bộ dữ liệu khách hàng...");
  const keys = await fetchWorker("list");
  if (keys && Array.isArray(keys)) {
    keys.forEach((k) => {
      const isBannedData = String(k.banned).toLowerCase() === "true" || k.banned === 1 || String(k.status).toLowerCase() === "banned" || k.flags >= 5;
      if (k.did && !isBannedData) userWhitelist.set(k.did, k.id);
    });
    console.log(`✅ Đã nạp thành công ${userWhitelist.size} keys vào bộ nhớ!`);
  }

  // 2. BACKGROUND CHECK (1 Phút / Lần)
  setInterval(async () => {
    if (userWhitelist.size === 0) return;
    const currentKeys = await fetchWorker("list");
    if (!currentKeys || !Array.isArray(currentKeys)) return;

    const now = Date.now();
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    for (const [discordId, userKey] of userWhitelist.entries()) {
      const keyData = currentKeys.find((k) => k.id === userKey);

      try {
        const member = await guild.members.fetch(discordId).catch(() => null);
        if (!member) continue;

        const isBanned = !keyData || String(keyData.banned).toLowerCase() === "true" || keyData.banned === 1 || String(keyData.status).toLowerCase() === "banned" || keyData.flags >= 5;

        // Bị xóa hoặc Ban
        if (isBanned) {
          userWhitelist.delete(discordId);
          try {
            await member.roles.remove(CUSTOMER_ROLE_ID);
            if (NOT_BUYER_ROLE_ID !== "YOUR_NOT_BUYER_ROLE_ID_HERE") {
              await member.roles.add(NOT_BUYER_ROLE_ID);
            }
          } catch (e) {}

          const banEmbed = new EmbedBuilder()
            .setColor("#ef4444")
            .setTitle("⛔ ACCOUNT REVOKED")
            .setDescription(`Your access to Zili Hub has been removed.\n\n**Reason:** ${!keyData ? "Key deleted by Admin." : "BANNED (Security Violation)."}`)
            .setFooter({ text: "Zili Hub Automated Security", iconURL: client.user.displayAvatarURL() })
            .setTimestamp();
          await member.send({ embeds: [banEmbed] }).catch(() => {});
          continue;
        }

        // Hết hạn
        if (keyData.expires_at && keyData.type !== "Lifetime") {
          const timeLeft = keyData.expires_at - now;

          if (timeLeft > 0 && timeLeft < EXPIRY_WARNING_THRESHOLD && !notifiedUsers.has(userKey)) {
            const warnEmbed = new EmbedBuilder()
              .setColor("#f59e0b")
              .setTitle("⏳ EXPIRY WARNING")
              // Đã gỡ dấu ` ở đây
              .setDescription(`Your Zili Hub license (||${userKey}||) will expire in less than 24 hours!\n\nPlease prepare to renew.`)
              .setFooter({ text: "Zili Hub Tracker", iconURL: client.user.displayAvatarURL() });
            await member.send({ embeds: [warnEmbed] }).catch(() => {});
            notifiedUsers.add(userKey);
          }

          if (timeLeft <= 0) {
            userWhitelist.delete(discordId);
            try {
              await member.roles.remove(CUSTOMER_ROLE_ID);
              if (NOT_BUYER_ROLE_ID !== "YOUR_NOT_BUYER_ROLE_ID_HERE") {
                await member.roles.add(NOT_BUYER_ROLE_ID);
              }
            } catch (e) {}

            const expEmbed = new EmbedBuilder()
              .setColor("#6b7280")
              .setTitle("⏰ LICENSE EXPIRED")
              .setDescription(`Your Zili Hub license has officially expired. Your roles have been removed.`)
              .setFooter({ text: "Zili Hub Tracker", iconURL: client.user.displayAvatarURL() });
            await member.send({ embeds: [expEmbed] }).catch(() => {});
          }
        }
      } catch (e) {}
    }
  }, 60 * 1000);
});

// ==========================================
// 🖥️ UI SETUP COMMAND
// ==========================================
client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content === "!setup") {
    const embed = new EmbedBuilder()
      .setColor("#8b5cf6")
      .setAuthor({ name: "ZILI HUB | ENTERPRISE SECURITY", iconURL: client.user.displayAvatarURL() })
      .setDescription("Welcome to the **Zili Hub Control Panel**. \nThis system is protected by our Anti-Tamper Engine.\n\n*Please select an option below to manage your access.*")
      .setImage("https://cdn.discordapp.com/attachments/1482474210243907747/1486798757734645832/0f77b7f8-7648-4aa3-bf67-545da725301a.webp")
      .setFooter({ text: "Zili Hub Security System • Protected Node", iconURL: client.user.displayAvatarURL() })
      .setTimestamp();

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("btn_redeem").setLabel("🔑 Redeem Key").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("btn_script").setLabel("📜 Get Script").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("btn_hwid").setLabel("🔄 Reset HWID").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("btn_status").setLabel("📊 Tracker").setStyle(ButtonStyle.Secondary)
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    message.delete().catch(() => {});
  }
});

// ==========================================
// 🖱️ BUTTON & MODAL HANDLER
// ==========================================
client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    const discordId = interaction.user.id;
    const userKey = userWhitelist.get(discordId);

    // --- NÚT 1: REDEEM ---
    if (interaction.customId === "btn_redeem") {
      if (userKey) {
        const alreadyEmbed = new EmbedBuilder()
          .setColor("#10b981")
          // Đã gỡ dấu ` ở đây
          .setDescription(`✅ You are already linked to an active key: ||${userKey}||\nNo need to redeem again.`);
        await interaction.reply({ embeds: [alreadyEmbed], ephemeral: true });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 15000);
        return;
      }

      const modal = new ModalBuilder().setCustomId("modal_redeem").setTitle("License Activation");
      const keyInput = new TextInputBuilder()
        .setCustomId("input_key")
        .setLabel("Paste your 32-character key here")
        .setPlaceholder("Example: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6")
        .setStyle(TextInputStyle.Short)
        .setMinLength(32)
        .setMaxLength(32)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(keyInput));
      return interaction.showModal(modal);
    }

    // CHECK QUYỀN TRƯỚC KHI BẤM CÁC NÚT KHÁC
    if (!userKey) {
      const deniedEmbed = new EmbedBuilder()
        .setColor("#ef4444")
        .setDescription("⛔ **ACCESS DENIED:** You are not whitelisted. Please click **🔑 Redeem Key** first.");
      await interaction.reply({ embeds: [deniedEmbed], ephemeral: true });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 15000);
      return;
    }

    // --- NÚT 2: GET SCRIPT ---
    if (interaction.customId === "btn_script") {
      const scriptEmbed = new EmbedBuilder()
        .setColor("#3b82f6")
        .setAuthor({ name: "Secure Loader Generated", iconURL: interaction.user.displayAvatarURL() })
        .setDescription("Copy the script below and paste it into your executor.\n⚠️ *This loader is heavily obfuscated and locked to your HWID.*")
        .addFields({
          name: "Inject Script",
          value: `\`\`\`lua\n_G.ZiLi_Key = "${userKey}";\nloadstring(game:HttpGet("https://${WORKER_URL.replace("https://", "")}/loader"))()\n\`\`\``,
        })
        .setFooter({ text: "Auto-deletes in 2 minutes for security.", iconURL: client.user.displayAvatarURL() });

      await interaction.reply({ embeds: [scriptEmbed], ephemeral: true });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 120000); // Xóa sau 2 phút
      return;
    } 
    
    // --- NÚT 3: RESET HWID ---
    else if (interaction.customId === "btn_hwid") {
      await interaction.deferReply({ ephemeral: true });
      const data = await fetchWorker("resethwid", { target: userKey });

      let hwidEmbed = new EmbedBuilder();
      if (data && data.success) {
        hwidEmbed.setColor("#10b981").setDescription(`✅ **HWID Wiped Successfully!**\nYou have **${data.resets_left}** resets remaining today.`);
      } else if (data && data.error === "Max Resets Reached") {
        hwidEmbed.setColor("#f59e0b").setDescription("⚠️ **Limit Reached:** You have used all 5 HWID resets for today. Please wait 24 hours.");
      } else {
        hwidEmbed.setColor("#ef4444").setDescription("❌ **Error:** Failed to communicate with licensing server. Try again later.");
      }

      await interaction.editReply({ embeds: [hwidEmbed] });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 30000); // Xóa sau 30s
      return;
    } 
    
    // --- NÚT 4: STATUS TRACKER ---
    else if (interaction.customId === "btn_status") {
      await interaction.deferReply({ ephemeral: true });
      const data = await fetchWorker("get", { target: userKey });
      
      if (!data || data.error) {
        await interaction.editReply({ embeds: [new EmbedBuilder().setColor("#ef4444").setDescription("❌ License not found in database.")] });
        setTimeout(() => interaction.deleteReply().catch(() => {}), 15000);
        return;
      }

      const userRoles = interaction.member.roles.cache
        .filter(role => role.name !== '@everyone')
        .map(role => `<@&${role.id}>`)
        .join(', ') || 'No Roles';

      const statusEmbed = new EmbedBuilder()
        .setColor("#8b5cf6")
        .setAuthor({ name: `${interaction.user.username}'s License Tracker`, iconURL: interaction.user.displayAvatarURL() })
        .addFields(
          { name: "🔑 License Key", value: `||${data.id}||`, inline: false },
          { name: "🏷️ Plan Type", value: `**${data.type}**`, inline: true },
          { name: "🔄 HWID Resets", value: `**${data.reset_count || 0}/5** (Daily)`, inline: true },
          { name: "⏰ Expiry Date", value: data.type === "Lifetime" ? "Never (Lifetime)" : `<t:${Math.floor(data.expires_at / 1000)}:F>\n(<t:${Math.floor(data.expires_at / 1000)}:R>)`, inline: false },
          { name: "🎭 Discord Roles", value: userRoles, inline: false }
        )
        .setFooter({ text: "Auto-deletes in 30 seconds." });

      await interaction.editReply({ embeds: [statusEmbed] });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 30000); // Xóa sau 30s
      return;
    }
  }

  // ==========================================
  // 📝 MODAL SUBMIT (XỬ LÝ KEY)
  // ==========================================
  if (interaction.isModalSubmit() && interaction.customId === "modal_redeem") {
    await interaction.deferReply({ ephemeral: true });
    const inputKey = interaction.fields.getTextInputValue("input_key").trim();
    const discordId = interaction.user.id;

    const res = await fetchWorker("redeem", { target: inputKey, did: discordId });

    if (!res || res.error) {
      let msg = "❌ **Invalid Key.** Please check your input.";
      if (res && res.error === "Banned") msg = "⛔ **Access Denied:** This key is BANNED.";
      if (res && res.error === "Already linked") msg = "⚠️ **Error:** This key is already linked to another Discord user!";
      if (res && res.error === "User already linked a key") msg = "⚠️ **Error:** Your Discord account already has an **ACTIVE** key linked.";

      await interaction.editReply({ embeds: [new EmbedBuilder().setColor("#ef4444").setDescription(msg)] });
      setTimeout(() => interaction.deleteReply().catch(() => {}), 15000);
      return;
    }

    try {
      const member = interaction.member;
      if (member) {
        await member.roles.add(CUSTOMER_ROLE_ID);
        if (NOT_BUYER_ROLE_ID !== "YOUR_NOT_BUYER_ROLE_ID_HERE") {
          await member.roles.remove(NOT_BUYER_ROLE_ID).catch(() => {});
        }
      }
    } catch (error) {
      console.error("Lỗi khi cấp Role:", error);
    }

    userWhitelist.set(discordId, inputKey);

    const successEmbed = new EmbedBuilder()
      .setColor("#10b981")
      .setAuthor({ name: "🎉 License Activated", iconURL: interaction.user.displayAvatarURL() })
      .setDescription(`Successfully linked your hardware to Discord.\nYou have been granted the **Customer** role!\n\n*Click **Get Script** to start.*`);

    await interaction.editReply({ embeds: [successEmbed] });
    setTimeout(() => interaction.deleteReply().catch(() => {}), 30000);
  }
});

client.login(TOKEN);
