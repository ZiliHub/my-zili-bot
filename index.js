const {
  Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, Events
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const API_URL = "https://temp.hackgpo59.workers.dev/";

const executors = {
  "delta": { name: "Delta", platform: "📱 Mobile", base: "🟢 FULL SUPPORT", baseScore: 96 },
  "arceus x": { name: "Arceus X", platform: "📱 Mobile", base: "🟢 FULL SUPPORT", baseScore: 95 },
  "vega": { name: "Vega", platform: "📱 Mobile", base: "⚪ UNKNOWN", baseScore: 0 },
  "codex": { name: "Codex", platform: "📱 Mobile", base: "🟡 LIMITED", baseScore: 68 },
  "synapse z": { name: "Synapse Z", platform: "🖥 PC", base: "🟢 FULL SUPPORT", baseScore: 99 },
  "volt": { name: "Volt", platform: "🖥 PC", base: "🟢 FULL SUPPORT", baseScore: 98 },
  "wave": { name: "Wave", platform: "🖥 PC", base: "🟡 LIMITED", baseScore: 75 }
};

function createProgressBar(percent) {
  const filled = Math.round((percent / 100) * 10);
  return `**\`[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}]\`**`;
}

async function sendVote(name, type, user) {
  try {
    const res = await fetch(API_URL + "vote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, user })
    });
    return await res.json(); 
  } catch (e) {
    return { success: false, error: "Could not connect to the server." };
  }
}

async function getStats(name) {
  try { return await (await fetch(API_URL + "stats/" + name)).json(); } catch { return null; }
}

async function getLeaderboard() {
  try { return await (await fetch(API_URL + "leaderboard")).json(); } catch { return []; }
}

client.once("ready", async () => {
  console.log(`✅ Bot ${client.user.tag} is online!`);

  const channel = await client.channels.fetch("1488456249900142645").catch(() => null);
  if (!channel) return console.log("❌ Could not find the channel!");

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("btn_panel").setLabel("📊 Status Panel").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("btn_lb").setLabel("🏆 Leaderboard").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("btn_vote_start").setLabel("🗳️ Vote Executor").setStyle(ButtonStyle.Secondary)
  );

  const mainEmbed = new EmbedBuilder()
    .setTitle("🚀 EXECUTOR SYSTEM HUB")
    .setDescription("Welcome to the Executor Status Hub!\n\n**📖 INSTRUCTIONS:**\n> **1️⃣ 📊 Status Panel:** View the current operational status of all Executors (Sorted with the best-rated apps at the top).\n> **2️⃣ 🏆 Leaderboard:** Check the community trust ranking based on votes.\n> **3️⃣ 🗳️ Vote Executor:** Rate the Executor you are using (Good/Normal/Bad) to help others. Cooldown is 24h/vote.\n\n*Note: To prevent spam, data panels will auto-delete after 20 seconds.*")
    .setColor("#ff88aa") 
    // REPLACE WITH YOUR IMAGE URL
    .setImage("https://i.pinimg.com/736x/82/63/ab/8263ab11d6d7919a16692df402dbb97f.jpg") 
    .setFooter({ text: "System Auto-Updating", iconURL: client.user.displayAvatarURL() })
    .setTimestamp();

  await channel.send({ embeds: [mainEmbed], components: [row] });
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {

    // 1️⃣ PANEL BUTTON
    if (interaction.customId === "btn_panel") {
      await interaction.deferReply({ ephemeral: true });

      const embed = new EmbedBuilder()
        .setTitle("📊 Current Executor Status")
        .setDescription("Displaying the list, prioritizing Executors with the highest scores at the top. *(Auto-deletes in 20s)*")
        .setColor("#ff88aa");

      let allData = [];
      for (let key in executors) {
        const ex = executors[key];
        let stats = await getStats(key);
        let status = ex.base;
        let percent = ex.baseScore;

        if (stats && (stats.good > 0 || stats.normal > 0 || stats.bad > 0)) {
          status = stats.status;
          percent = stats.percent;
        }
        allData.push({ key, ex, status, percent });
      }

      // Sort: Highest score first
      allData.sort((a, b) => b.percent - a.percent);

      let mobileText = "", pcText = "";
      allData.forEach(({ ex, status, percent }) => {
        const bar = createProgressBar(percent);
        const line = `> **${ex.name}**\n> Status: ${status} \n> Score: ${bar} **${percent}%**\n\n`;
        if (ex.platform.includes("Mobile")) mobileText += line;
        else pcText += line;
      });

      embed.addFields(
        { name: "📱 MOBILE EXECUTORS", value: mobileText || "Updating..." },
        { name: "🖥️ PC EXECUTORS", value: pcText || "Updating..." }
      );

      await interaction.editReply({ embeds: [embed] });
      // 🕒 AUTO-DELETE AFTER 20 SECONDS
      return setTimeout(() => interaction.deleteReply().catch(() => {}), 20000);
    }

    // 2️⃣ LEADERBOARD BUTTON
    if (interaction.customId === "btn_lb") {
      await interaction.deferReply({ ephemeral: true });

      const data = await getLeaderboard();
      const embed = new EmbedBuilder()
        .setTitle("🏆 Community Leaderboard")
        .setDescription("Top most trusted Executors based on votes. *(Auto-deletes in 20s)*")
        .setColor("#ffcc00");

      let mobileText = "", pcText = "";
      data.forEach((e, i) => {
        const exConfig = executors[e.name.toLowerCase()];
        if (!exConfig) return;

        let rankIcon = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🏅";
        const line = `**${rankIcon} ${exConfig.name}**\n${createProgressBar(e.score)} **${e.score}%**\n\n`;

        if (exConfig.platform.includes("Mobile")) mobileText += line;
        else pcText += line;
      });

      embed.addFields(
        { name: "📱 TOP MOBILE", value: mobileText || "No data yet" },
        { name: "🖥️ TOP PC", value: pcText || "No data yet" }
      );

      await interaction.editReply({ embeds: [embed] });
      // 🕒 AUTO-DELETE AFTER 20 SECONDS
      return setTimeout(() => interaction.deleteReply().catch(() => {}), 20000);
    }

    // 3️⃣ VOTE START BUTTON
    if (interaction.customId === "btn_vote_start") {
      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_vote_executor")
        .setPlaceholder("Click here to select an Executor...")
        .addOptions(Object.keys(executors).map(key => ({
            label: executors[key].name,
            description: `Platform: ${executors[key].platform}`,
            value: key,
            emoji: executors[key].platform.includes("Mobile") ? "📱" : "🖥️"
        })));

      await interaction.reply({
        content: "🗳️ **Which Executor do you want to vote for?**\nPlease select from the menu below *(Menu auto-deletes in 20s)*:",
        components: [new ActionRowBuilder().addComponents(selectMenu)],
        ephemeral: true
      });
      
      // 🕒 AUTO-DELETE AFTER 20 SECONDS
      return setTimeout(() => interaction.deleteReply().catch(() => {}), 20000);
    }

    // 4️⃣ SEND VOTE (GOOD/NORMAL/BAD)
    if (interaction.customId.startsWith("vote_")) {
      const [, type, name] = interaction.customId.split("_"); 
      await interaction.deferUpdate();

      const response = await sendVote(name, type, interaction.user.id);

      if (!response || !response.success) {
        const errorEmbed = new EmbedBuilder()
          .setTitle("⚠️ Error / Cooldown")
          .setDescription(response?.error || "Unknown error.")
          .setColor("#ff3333");

        await interaction.editReply({ content: null, embeds: [errorEmbed], components: [] });
        return setTimeout(() => interaction.deleteReply().catch(() => {}), 15000); // Errors delete in 15s
      }

      const successEmbed = new EmbedBuilder()
        .setTitle("✅ Vote Successful!")
        .setDescription(`Thank you <@${interaction.user.id}>! You voted **${type.toUpperCase()}** for **${executors[name].name}**.\n\n*(This message will auto-delete in 15 seconds)*`)
        .setColor("#ff88aa");

      await interaction.editReply({ content: null, embeds: [successEmbed], components: [] });
      // 🕒 AUTO-DELETE AFTER 15 SECONDS
      return setTimeout(() => interaction.deleteReply().catch(() => {}), 15000);
    }
  }

  // ================= EXECUTOR SELECTION MENU =================
  if (interaction.isStringSelectMenu() && interaction.customId === "select_vote_executor") {
    const key = interaction.values[0];
    const exName = executors[key].name;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`vote_good_${key}`).setLabel("Working (Good)").setEmoji("🟢").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`vote_normal_${key}`).setLabel("Issues (Normal)").setEmoji("🟡").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`vote_bad_${key}`).setLabel("Patched/Ban (Bad)").setEmoji("🔴").setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle(`🗳️ Rate: ${exName}`)
      .setDescription(`What is the current status of **${exName}**?\n\n🟢 **Good**: Scripts run smoothly.\n🟡 **Normal**: Crashing, minor bugs.\n🔴 **Bad**: Completely patched, causes bans.\n\n*(This panel will auto-delete in 20s)*`)
      .setColor("#ffcc00");

    await interaction.update({ content: null, embeds: [embed], components: [row] });
    
    // Note: Update doesn't need a new delete timeout as it's tied to the one created by the Vote Start button.
  }
});

client.login(process.env.TOKEN);
