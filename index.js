
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
// ⚙️ CONFIGURATION (ĐÃ SỬA ĐỂ BẢO MẬT)
// ==========================================
// Lấy Token và Pass từ biến môi trường của Railway/VPS
const TOKEN = process.env.TOKEN; 
const ADMIN_PASS = process.env.ADMIN_PASS; 
const WORKER_URL = "https://script-api.hackgpo59.workers.dev";

// ĐIỀN CÁC ID CỦA SERVER BẠN VÀO ĐÂY:
const GUILD_ID = "1484337235003179078";
const CUSTOMER_ROLE_ID = "1485555230711222332";
const NOT_BUYER_ROLE_ID = "1485555042856603749";

const EXPIRY_WARNING_THRESHOLD = 24 * 60 * 60 * 1000;

// LƯU Ý LỚN: Biến này lưu trên RAM. 
// Khi server bot khởi động lại, danh sách này sẽ trống!
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
    console.error("Lỗi khi fetch API:", e);
    return null;
  }
}

// ... [GIỮ NGUYÊN TOÀN BỘ PHẦN CODE CÒN LẠI CỦA BẠN TỪ ĐOẠN client.once("ready", ...) TRỞ XUỐNG] ...
// Lưu ý: ở cuối file vẫn là client.login(TOKEN);

client.once("ready", () => {
  console.log(`✅ Enterprise Security Bot Online: ${client.user.tag}`);
  client.user.setActivity("System Security", { type: 3 });

  // YÊU CẦU 1: GỬI EMBED DM THÔNG BÁO TỰ ĐỘNG
  setInterval(async () => {
    if (userWhitelist.size === 0) return;
    const keys = await fetchWorker("list");
    if (!keys || !Array.isArray(keys)) return;

    const now = Date.now();
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) return;

    for (const [discordId, userKey] of userWhitelist.entries()) {
      const keyData = keys.find((k) => k.id === userKey);

      try {
        const member = await guild.members.fetch(discordId).catch(() => null);
        if (!member) continue;

        // TRƯỜNG HỢP 1: BỊ XÓA HOẶC BAN
        if (!keyData || keyData.banned || keyData.flags >= 5) {
          userWhitelist.delete(discordId);

          try {
            await member.roles.remove(CUSTOMER_ROLE_ID);
            if (NOT_BUYER_ROLE_ID !== "YOUR_NOT_BUYER_ROLE_ID_HERE") {
              await member.roles.add(NOT_BUYER_ROLE_ID);
            }
          } catch (e) {}

          const reason = !keyData
            ? "Your Key has been deleted by an Administrator."
            : "Your Key has been BANNED (Security Violation or Admin Action).";
          const banEmbed = new EmbedBuilder()
            .setColor("#ff0033")
            .setTitle("⛔ ACCOUNT REVOKED")
            .setDescription(
              `Your access to Zili Hub has been removed.\n\n**Reason:** ${reason}`,
            )
            .setTimestamp();
          await member.send({ embeds: [banEmbed] }).catch(() => {});
          continue;
        }

        // TRƯỜNG HỢP 2: HẾT HẠN
        if (keyData.expires_at && keyData.type !== "Lifetime") {
          const timeLeft = keyData.expires_at - now;

          if (
            timeLeft > 0 &&
            timeLeft < EXPIRY_WARNING_THRESHOLD &&
            !notifiedUsers.has(userKey)
          ) {
            const warnEmbed = new EmbedBuilder()
              .setColor("#facc15")
              .setTitle("⏳ EXPIRY WARNING")
              .setDescription(
                `Your Zili Hub license (\`||${userKey.substring(0, 8)}...||\`) will expire in less than 24 hours!\n\nPlease prepare to renew to avoid interruption.`,
              )
              .setTimestamp();
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
              .setColor("#9ca3af")
              .setTitle("⏰ LICENSE EXPIRED")
              .setDescription(
                `Your Zili Hub license has officially expired.\nYour roles have been updated to Not Buyer.`,
              )
              .setTimestamp();
            await member.send({ embeds: [expEmbed] }).catch(() => {});
          }
        }
      } catch (e) {}
    }
  }, 60 * 1000); // 1 Phút check 1 lần
});

client.on("messageCreate", async (message) => {
  if (message.author.bot) return;
  if (message.content === "!setup") {
    const embed = new EmbedBuilder()
      .setColor("#9333ea")
      .setTitle("🌌 ZILI HUB | SECURITY PANEL")
      .setDescription(
        "System is protected by Anti-Tamper Engine. Select an option to manage your access.",
      )
      .setImage(
        "https://cdn.discordapp.com/attachments/1482474210243907747/1486798757734645832/0f77b7f8-7648-4aa3-bf67-545da725301a.webp",
      )
      .setFooter({
        text: "Zili Hub Security System",
        iconURL: client.user.displayAvatarURL(),
      }) // Nâng cấp UI: Footer
      .setTimestamp(); // Nâng cấp UI: Timestamp

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("btn_redeem")
        .setLabel("🔑 Redeem Key")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("btn_script")
        .setLabel("📜 Get Script")
        .setStyle(ButtonStyle.Primary),
      new ButtonBuilder()
        .setCustomId("btn_hwid")
        .setLabel("🔄 Reset HWID")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("btn_status")
        .setLabel("📊 Tracker")
        .setStyle(ButtonStyle.Secondary),
    );

    await message.channel.send({ embeds: [embed], components: [row] });
    message.delete().catch(() => {});
  }
});

client.on("interactionCreate", async (interaction) => {
  if (interaction.isButton()) {
    const discordId = interaction.user.id;
    const userKey = userWhitelist.get(discordId);

    if (interaction.customId === "btn_redeem") {
      if (userKey) {
        const alreadyEmbed = new EmbedBuilder()
          .setColor("#22c55e")
          .setTitle("✅ ALREADY WHITELISTED")
          .setDescription(
            `You are already linked to an active key (\`||${userKey.substring(0, 8)}...||\`).\nThere is no need to redeem again!`,
          )
          .setTimestamp();
        return interaction.reply({ embeds: [alreadyEmbed], ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId("modal_redeem")
        .setTitle("License Activation");

      const keyInput = new TextInputBuilder()
        .setCustomId("input_key")
        .setLabel("Paste your 32-character key here")
        .setPlaceholder("VD: a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6") // Nâng cấp UI: Placeholder
        .setStyle(TextInputStyle.Short)
        .setMinLength(32)
        .setMaxLength(32)
        .setRequired(true);

      modal.addComponents(new ActionRowBuilder().addComponents(keyInput));
      return interaction.showModal(modal);
    }

    if (!userKey) {
      return interaction.reply({
        embeds: [
          new EmbedBuilder()
            .setColor("#ff0033")
            .setTitle("⛔ ACCESS DENIED")
            .setDescription(
              "You are not whitelisted. Click **🔑 Redeem Key** first.",
            ),
        ],
        ephemeral: true,
      });
    }

    if (interaction.customId === "btn_script") {
      const scriptEmbed = new EmbedBuilder()
        .setColor("#22c55e")
        .setTitle("✅ Secure Loader Generated")
        .setDescription("Copy the script below. It is locked to your PC.")
        .addFields({
          name: "Loader",
          value: `\`\`\`lua\n_G.ZiLi_Key = "${userKey}";\nloadstring(game:HttpGet("https://${WORKER_URL.replace("https://", "")}/loader"))()\n\`\`\``,
        });
      return interaction.reply({ embeds: [scriptEmbed], ephemeral: true });
    } else if (interaction.customId === "btn_hwid") {
      await interaction.deferReply({ ephemeral: true });
      const data = await fetchWorker("resethwid", { target: userKey });

      // Nâng cấp UI: Chuyển đổi phản hồi text thuần thành Embed đồng bộ
      if (data && data.success) {
        const successEmbed = new EmbedBuilder()
          .setColor("#22c55e")
          .setDescription(
            `✅ **HWID Wiped!** You have **${data.resets_left}** resets remaining today.`,
          );
        return interaction.editReply({ embeds: [successEmbed] });
      }

      if (data && data.error === "Max Resets Reached") {
        const limitEmbed = new EmbedBuilder()
          .setColor("#facc15")
          .setDescription(
            "⚠️ **Limit Reached:** You have used all 5 HWID resets for today. Please wait 24 hours from your first reset.",
          );
        return interaction.editReply({ embeds: [limitEmbed] });
      }

      const errorEmbed = new EmbedBuilder()
        .setColor("#ff0033")
        .setDescription("❌ **Error:** Could not reset HWID.");
      return interaction.editReply({ embeds: [errorEmbed] });
    } else if (interaction.customId === "btn_status") {
      await interaction.deferReply({ ephemeral: true });
      const data = await fetchWorker("get", { target: userKey });
      if (!data || data.error)
        return interaction.editReply("❌ License not found.");

      const statusEmbed = new EmbedBuilder()
        .setColor("#9333ea")
        .setTitle("📊 License Tracker")
        .addFields(
          {
            name: "Key",
            value: `||${data.id.substring(0, 8)}...||`, // Nâng cấp UI: Che giấu Key bằng Spoiler
            inline: true,
          },
          { name: "Type", value: data.type, inline: true },
          {
            name: "HWID Resets",
            value: `${data.reset_count || 0}/5 (24h)`,
            inline: true,
          },
          {
            name: "Expires",
            value:
              data.type === "Lifetime"
                ? "Never"
                : `<t:${Math.floor(data.expires_at / 1000)}:R>`,
            inline: false,
          },
        );
      return interaction.editReply({ embeds: [statusEmbed] });
    }
  }

  if (interaction.isModalSubmit() && interaction.customId === "modal_redeem") {
    await interaction.deferReply({ ephemeral: true });
    const inputKey = interaction.fields.getTextInputValue("input_key").trim();
    const discordId = interaction.user.id;

    const res = await fetchWorker("redeem", {
      target: inputKey,
      did: discordId,
    });

    if (!res || res.error) {
      let msg = "❌ **Invalid Key.** Please check your input.";
      if (res && res.error === "Banned")
        msg = "⛔ **Access Denied:** This key is BANNED.";
      if (res && res.error === "Already linked")
        msg =
          "⚠️ **Error:** This key is already linked to another Discord user!";
      if (res && res.error === "User already linked a key")
        msg =
          "⚠️ **Error:** Your Discord account already has an **ACTIVE** key linked.";

      return interaction.editReply({
        embeds: [
          new EmbedBuilder()
            .setColor("#ff0033")
            .setTitle("⛔ ERROR")
            .setDescription(msg),
        ],
      });
    }

    try {
      const member = interaction.member;
      if (member && CUSTOMER_ROLE_ID !== "123456789012345678") {
        await member.roles.add(CUSTOMER_ROLE_ID);
        if (NOT_BUYER_ROLE_ID !== "YOUR_NOT_BUYER_ROLE_ID_HERE") {
          await member.roles.remove(NOT_BUYER_ROLE_ID).catch(() => {});
        }
      }
    } catch (error) {
      console.error(error);
    }

    userWhitelist.set(discordId, inputKey);

    return interaction.editReply({
      embeds: [
        new EmbedBuilder()
          .setColor("#22c55e")
          .setTitle("🎉 License Activated")
          .setDescription(
            `Successfully linked to your Discord Account.\nYou have been granted the Customer role!`,
          ),
      ],
    });
  }
});

client.login(TOKEN);
