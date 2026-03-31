const {
  Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, Events
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const API_URL = "https://temp.hackgpo59.workers.dev/";

// 📋 CẬP NHẬT DANH SÁCH EXECUTORS MỚI NHẤT
const executors = {
  // --- MOBILE ---
  "delta": { name: "Delta", platform: "📱 Mobile", base: "🟢 FULL SUPPORT", baseScore: 96 },
  "arceus x": { name: "Arceus X", platform: "📱 Mobile", base: "🟢 FULL SUPPORT", baseScore: 95 },
  "vega": { name: "Vega", platform: "📱 Mobile", base: "⚪ UNKNOWN", baseScore: 0 },
  "codex": { name: "Codex", platform: "📱 Mobile", base: "🟡 LIMITED", baseScore: 68 },
  
  // --- PC (OLD) ---
  "synapse z": { name: "Synapse Z", platform: "🖥 PC", base: "🟢 FULL SUPPORT", baseScore: 99 },
  "volt": { name: "Volt", platform: "🖥 PC", base: "🟢 FULL SUPPORT", baseScore: 98 },
  "wave": { name: "Wave", platform: "🖥 PC", base: "🟡 LIMITED", baseScore: 75 },

  // --- PC (NEW ADDED) ---
  "potassium": { name: "Potassium", platform: "🖥 PC", base: "🟢 FULL SUPPORT", baseScore: 94 },
  "cosmic": { name: "Cosmic", platform: "🖥 PC", base: "🟢 FULL SUPPORT", baseScore: 92 },
  "isavae": { name: "Isavae", platform: "🖥 PC", base: "🟡 LIMITED", baseScore: 65 },
  "velocity": { name: "Velocity", platform: "🖥 PC", base: "🟡 LIMITED", baseScore: 58 },
  "seliware": { name: "Seliware", platform: "🖥 PC", base: "🔴 NOT SUPPORT", baseScore: 25 },
  "sirhurt": { name: "Sirhurt", platform: "🖥 PC", base: "🔴 NOT SUPPORT", baseScore: 18 },
  "solara": { name: "Solara", platform: "🖥 PC", base: "🔴 NOT SUPPORT", baseScore: 12 },
  "xeno": { name: "Xeno", platform: "🖥 PC", base: "🔴 NOT SUPPORT", baseScore: 5 }
};

// ⚡ CACHE SYSTEM
let cache = { data: null, lastFetch: 0 };

async function fetchAllData() {
  if (cache.data && Date.now() - cache.lastFetch < 30000) return cache.data; 
  try {
    const res = await fetch(API_URL + "all");
    cache.data = await res.json();
    cache.lastFetch = Date.now();
    return cache.data;
  } catch (e) {
    return {};
  }
}

// DYNAMIC COLOR GENERATOR
function getDynamicColor(score, total) {
  if (total === 0) return "#808080"; 
  if (score >= 90) return "#00ff99"; 
  if (score >= 50) return "#ffcc00"; 
  return "#ff3333"; 
}

function createProgressBar(percent) {
  const filled = Math.round((percent / 100) * 10);
  return `**\`[${'█'.repeat(filled)}${'░'.repeat(10 - filled)}]\`**`;
}

// 🎭 EMOTIONAL FEEDBACK MESSAGES
const voteFeedback = {
  good: [
    "Awesome! Thanks for keeping the community updated 🚀",
    "Legend! We love a smooth working executor 🟢",
    "Perfect! You just helped thousands of players ✔️"
  ],
  normal: [
    "Noted! Hopefully the devs patch those bugs soon 🛠️",
    "Thanks for the heads up! Expect some crashes with this one 🟡",
    "Recorded! It's surviving, but barely. 📉"
  ],
  bad: [
    "Yikes! Thanks for taking one for the team 💀",
    "Warning logged! Everyone stay away from this one for now 🔴",
    "Ouch! Thanks for scanning the minefield for us 💣"
  ]
};

async function sendVote(name, type, user) {
  try {
    const res = await fetch(API_URL + "vote", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, type, user })
    });
    const result = await res.json();
    if (result.success) cache.lastFetch = 0; 
    return result;
  } catch (e) {
    return { success: false, error: "Could not connect to the server." };
  }
}

client.once("ready", async () => {
  console.log(`✅ System Online: ${client.user.tag}`);
  const channel = await client.channels.fetch("1488456249900142645").catch(() => null);
  if (!channel) return;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("btn_panel").setLabel("📊 Status Panel").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("btn_lb").setLabel("🏆 Leaderboard").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("btn_vote_start").setLabel("🗳️ Vote Executor").setStyle(ButtonStyle.Secondary)
  );

  const mainEmbed = new EmbedBuilder()
    .setTitle("🚀 EXECUTOR SYSTEM HUB")
    .setDescription("Welcome to the Executor Status Hub!\n\n**📖 INSTRUCTIONS:**\n> **1️⃣ 📊 Status Panel:** View the current operational status of all Executors.\n> **2️⃣ 🏆 Leaderboard:** Check the community trust ranking based on votes.\n> **3️⃣ 🗳️ Vote Executor:** Rate the Executor you are using (Cooldown is 24h/vote).\n\n*Note: To prevent spam, data panels will auto-delete after 20 seconds.*")
    .setColor("#ff88aa") 
    .setImage("https://i.pinimg.com/736x/82/63/ab/8263ab11d6d7919a16692df402dbb97f.jpg") // NHỚ ĐỔI LINK ẢNH CỦA BẠN VÀO ĐÂY NHÉ
    .setFooter({ text: "System Auto-Updating", iconURL: client.user.displayAvatarURL() })
    .setTimestamp();

  await channel.send({ embeds: [mainEmbed], components: [row] });
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {

    // 1️⃣ STATUS PANEL
    if (interaction.customId === "btn_panel") {
      await interaction.deferReply({ ephemeral: true });
      const apiData = await fetchAllData();
      
      let allData = Object.keys(executors).map(key => {
        const ex = executors[key];
        const stats = apiData[key];
        const status = stats && stats.totalVotes > 0 ? stats.status : ex.base;
        const percent = stats && stats.totalVotes > 0 ? stats.percent : ex.baseScore;
        const totalVotes = stats ? stats.totalVotes : 0;
        return { key, ex, status, percent, totalVotes };
      });

      // Sort: Highest score first
      allData.sort((a, b) => b.percent - a.percent || b.totalVotes - a.totalVotes);

      const panelColor = getDynamicColor(allData[0]?.percent || 0, allData[0]?.totalVotes || 1);

      const embed = new EmbedBuilder()
        .setTitle("📊 Current Executor Status")
        .setDescription("Live database tracking. *(Auto-deletes in 20s)*")
        .setColor(panelColor);

      const processCategory = (dataArray) => {
        let text = "";
        dataArray.forEach((item, index) => {
          const rankIcon = index === 0 ? "👑" : "🔹"; 
          const bar = createProgressBar(item.percent);
          text += `> ${rankIcon} **${item.ex.name}**\n> Status: ${item.status} \n> Score: ${bar} **${item.percent}%** (${item.totalVotes} votes)\n\n`; 
        });
        return text || "Updating...";
      };

      const mobileText = processCategory(allData.filter(d => d.ex.platform.includes("Mobile")));
      const pcText = processCategory(allData.filter(d => d.ex.platform.includes("PC")));

      embed.addFields(
        { name: "📱 MOBILE EXECUTORS", value: mobileText },
        { name: "🖥️ PC EXECUTORS", value: pcText }
      );

      await interaction.editReply({ embeds: [embed] });
      return setTimeout(() => interaction.deleteReply().catch(() => {}), 20000);
    }

    // 2️⃣ LEADERBOARD
    if (interaction.customId === "btn_lb") {
      await interaction.deferReply({ ephemeral: true });
      const apiData = await fetchAllData();

      let allData = Object.keys(executors).map(key => {
        const stats = apiData[key];
        return { 
          ex: executors[key], 
          percent: stats ? stats.percent : 0, 
          totalVotes: stats ? stats.totalVotes : 0 
        };
      }).filter(d => d.totalVotes > 0); 

      let mobileData = allData.filter(d => d.ex.platform.includes("Mobile")).sort((a, b) => b.percent - a.percent || b.totalVotes - a.totalVotes);
      let pcData = allData.filter(d => d.ex.platform.includes("PC")).sort((a, b) => b.percent - a.percent || b.totalVotes - a.totalVotes);

      const embed = new EmbedBuilder()
        .setTitle("🏆 Community Leaderboard")
        .setDescription("Top trusted Executors based on community votes. *(Auto-deletes in 20s)*")
        .setColor("#ffcc00");

      const processLB = (dataArr) => {
        let text = "";
        dataArr.forEach((item, i) => {
          let rankIcon = i === 0 ? "🥇" : i === 1 ? "🥈" : i === 2 ? "🥉" : "🏅"; 
          text += `**${rankIcon} ${item.ex.name}**\n${createProgressBar(item.percent)} **${item.percent}%** (${item.totalVotes} votes)\n\n`;
        });
        return text || "No data yet";
      };

      embed.addFields(
        { name: "📱 TOP MOBILE", value: processLB(mobileData) },
        { name: "🖥️ TOP PC", value: processLB(pcData) }
      );

      await interaction.editReply({ embeds: [embed] });
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
      return setTimeout(() => interaction.deleteReply().catch(() => {}), 20000);
    }

    // 4️⃣ SEND VOTE
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
        return setTimeout(() => interaction.deleteReply().catch(() => {}), 15000); 
      }

      const randomMsg = voteFeedback[type][Math.floor(Math.random() * voteFeedback[type].length)];
      const voteColor = type === "good" ? "#00ff99" : type === "normal" ? "#ffcc00" : "#ff3333";

      const successEmbed = new EmbedBuilder()
        .setTitle("✅ Vote Successful!")
        .setDescription(`**${randomMsg}**\n\nThank you <@${interaction.user.id}>! You voted **${type.toUpperCase()}** for **${executors[name].name}**.\n\n*(This message will auto-delete in 15 seconds)*`)
        .setColor(voteColor);

      await interaction.editReply({ content: null, embeds: [successEmbed], components: [] });
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
  }
});

client.login(process.env.TOKEN);
