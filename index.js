require('dotenv').config(); // Thêm dòng này để nạp biến môi trường nếu chạy local
const {
  Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, Events
} = require('discord.js');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const API_URL = "https://temp.hackgpo59.workers.dev/";

// 📋 EXECUTOR LIST
const executors = {
  "delta": { name: "Delta", platform: "📱 Mobile", base: "🟢 FULL SUPPORT", baseScore: 96 },
  "arceus x": { name: "Arceus X", platform: "📱 Mobile", base: "🟢 FULL SUPPORT", baseScore: 95 },
  "vega": { name: "Vega", platform: "📱 Mobile", base: "⚪ UNKNOWN", baseScore: 0 },
  "codex": { name: "Codex", platform: "📱 Mobile", base: "🟡 LIMITED", baseScore: 68 },
  "synapse z": { name: "Synapse Z", platform: "🖥 PC", base: "🟢 FULL SUPPORT", baseScore: 99 },
  "volt": { name: "Volt", platform: "🖥 PC", base: "🟢 FULL SUPPORT", baseScore: 98 },
  "wave": { name: "Wave", platform: "🖥 PC", base: "🟡 LIMITED", baseScore: 75 },
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
  if (cache.data && Date.now() - cache.lastFetch < 30000) return { success: true, data: cache.data };
  try {
    const res = await fetch(API_URL + "all");
    if (!res.ok) throw new Error("API responded with an error");
    cache.data = await res.json();
    cache.lastFetch = Date.now();
    return { success: true, data: cache.data };
  } catch (e) {
    return { success: false, error: "Database offline or fetching failed." };
  }
}

// 🎨 DYNAMIC COLORS
function getDynamicColor(score, total) {
  if (total === 0) return "#808080"; 
  if (score >= 90) return "#00ff99"; 
  if (score >= 50) return "#ffcc00"; 
  return "#ff3333"; 
}

// 📊 GRADIENT PROPORTION BAR (10 Blocks)
function createProportionBar(good, normal, bad, total) {
  if (total === 0) return "⬛".repeat(10);
  
  let g = Math.round((good / total) * 10);
  let n = Math.round((normal / total) * 10);
  let b = Math.round((bad / total) * 10);

  const diff = 10 - (g + n + b);
  if (diff !== 0) {
    const max = Math.max(g, n, b);
    if (max === g) g += diff;
    else if (max === n) n += diff;
    else b += diff;
  }
  
  g = Math.max(0, g); n = Math.max(0, n); b = Math.max(0, b);
  return `${"🟩".repeat(g)}${"🟨".repeat(n)}${"🟥".repeat(b)}`;
}

// 🧹 HELPER: XÓA TIN NHẮN
const autoDelete = (interaction, ms = 20000) => {
  setTimeout(() => interaction.deleteReply().catch(() => {}), ms);
};

// 🎭 EMOTIONAL FEEDBACK
const voteFeedback = {
  good: { emoji: "🎉", msgs: ["Awesome! Thanks for keeping the community updated!", "Legend! Smooth working executor confirmed."], gif: "https://media.giphy.com/media/11ISwbgCxEzMyY/giphy.gif" },
  normal: { emoji: "⚠️", msgs: ["Noted! Devs need to patch those bugs soon.", "Heads up recorded! Expect some crashes."], gif: "https://media.giphy.com/media/1FqEpoDU0FqAE/giphy.gif" },
  bad: { emoji: "💀", msgs: ["Yikes! Thanks for taking one for the team.", "Warning logged! Everyone stay away from this one."], gif: "https://media.giphy.com/media/4ilFRqgbzbx4c/giphy.gif" }
};

client.once("ready", async () => {
  console.log(`✅ System Online: ${client.user.tag}`);
  const channel = await client.channels.fetch("1488456249900142645").catch(() => null);
  if (!channel) return;

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId("btn_vote_start").setLabel("🗳️ Vote Executor").setStyle(ButtonStyle.Success),
    new ButtonBuilder().setCustomId("btn_panel").setLabel("📊 Status Panel").setStyle(ButtonStyle.Primary),
    new ButtonBuilder().setCustomId("btn_lb").setLabel("🏆 Leaderboard").setStyle(ButtonStyle.Secondary)
  );

  const mainEmbed = new EmbedBuilder()
    .setTitle("🚀 EXECUTOR SYSTEM HUB")
    .setDescription("Welcome to the Executor Status Hub!\n\n**📖 INSTRUCTIONS:**\n> **1️⃣ 🗳️ Vote Executor:** Rate the Executor you are using (Cooldown is 24h/vote).\n> **2️⃣ 📊 Status Panel:** View the current operational status & stats.\n> **3️⃣ 🏆 Leaderboard:** Check the community trust ranking based on votes.\n\n*Note: To prevent spam, data panels will auto-delete after 20 seconds.*")
    .setColor("#ff88aa") 
    .setImage("https://i.pinimg.com/736x/a1/d4/6b/a1d46bd5ff8a6b96c564f5f4d1e23a6a.jpg")
    .setFooter({ text: "System Auto-Updating", iconURL: client.user.displayAvatarURL() })
    .setTimestamp();

  await channel.send({ embeds: [mainEmbed], components: [row] });
});

client.on(Events.InteractionCreate, async interaction => {
  if (interaction.isButton()) {

    if (interaction.customId === "btn_vote_start") {
      await interaction.deferReply({ ephemeral: true });
      const apiRes = await fetchAllData();
      const dbData = apiRes.success ? apiRes.data : {};

      const selectMenu = new StringSelectMenuBuilder()
        .setCustomId("select_vote_executor")
        .setPlaceholder("Click here to select an Executor...")
        .addOptions(Object.keys(executors).map(key => {
            const stats = dbData[key];
            let desc = `Platform: ${executors[key].platform}`;
            if (stats && stats.totalVotes > 0) {
              desc += ` | Score: ${stats.percent}% | Votes: ${stats.totalVotes}`;
            } else {
              desc += ` | Unrated (Base: ${executors[key].baseScore}%)`;
            }

            return {
              label: executors[key].name,
              description: desc,
              value: key,
              emoji: executors[key].platform.includes("Mobile") ? "📱" : "🖥️"
            };
        }));

      await interaction.editReply({
        content: "🗳️ **Which Executor do you want to vote for?**\nPlease select from the menu below:",
        components: [new ActionRowBuilder().addComponents(selectMenu)]
      });
      return autoDelete(interaction, 25000);
    }

    if (interaction.customId === "btn_panel") {
      await interaction.deferReply({ ephemeral: true });
      const apiRes = await fetchAllData();
      
      if (!apiRes.success) {
        const errorEmbed = new EmbedBuilder().setTitle("🚨 API Error").setDescription(apiRes.error).setColor("#ff3333");
        await interaction.editReply({ embeds: [errorEmbed] });
        return autoDelete(interaction);
      }

      const apiData = apiRes.data;
      let allData = Object.keys(executors).map(key => {
        const ex = executors[key];
        const stats = apiData[key];
        const status = stats && stats.totalVotes > 0 ? stats.status : ex.base;
        const percent = stats && stats.totalVotes > 0 ? stats.percent : ex.baseScore;
        const g = stats ? stats.good : 0, n = stats ? stats.normal : 0, b = stats ? stats.bad : 0;
        const totalVotes = stats ? stats.totalVotes : 0;
        const miniChart = totalVotes > 0 ? `\`[👍 ${g} | 🟡 ${n} | 🔴 ${b}]\`` : `\`[No votes yet]\``;
        const bar = createProportionBar(g, n, b, totalVotes);

        return { key, ex, status, percent, totalVotes, miniChart, bar };
      });

      allData.sort((a, b) => b.percent - a.percent || b.totalVotes - a.totalVotes);
      const panelColor = getDynamicColor(allData[0]?.percent || 0, allData[0]?.totalVotes || 1);

      const embed = new EmbedBuilder()
        .setTitle("📊 Current Executor Status")
        .setDescription("Live database tracking with community vote charts.\n🟩 Good | 🟨 Normal | 🟥 Bad *(Auto-deletes in 20s)*")
        .setColor(panelColor);

      const processCategory = (dataArray) => {
        let text = "";
        dataArray.forEach((item, index) => {
          if (index < 3) {
            const rankIcon = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
            text += `> ${rankIcon} **${item.ex.name.toUpperCase()}**\n> Status: ${item.status}\n> Trust: **${item.bar}** **${item.percent}%**\n> Stats: ${item.miniChart}\n> ━━━━━━━━━━━━━━\n\n`;
          } else {
            text += `🔹 **${item.ex.name}** — ${item.miniChart}\n> Status: ${item.status} | Trust: **${item.percent}%**\n\n`;
          }
        });
        return text || "Updating...";
      };

      embed.addFields(
        { name: "📱 MOBILE EXECUTORS", value: processCategory(allData.filter(d => d.ex.platform.includes("Mobile"))) },
        { name: "🖥️ PC EXECUTORS", value: processCategory(allData.filter(d => d.ex.platform.includes("PC"))) }
      );

      await interaction.editReply({ embeds: [embed] });
      return autoDelete(interaction);
    }

    if (interaction.customId === "btn_lb") {
      await interaction.deferReply({ ephemeral: true });
      const apiRes = await fetchAllData();
      if (!apiRes.success) {
        return interaction.editReply({ embeds: [new EmbedBuilder().setTitle("🚨 Error").setDescription(apiRes.error).setColor("#ff3333")] }).then(() => autoDelete(interaction));
      }

      const apiData = apiRes.data;
      let allData = Object.keys(executors).map(key => {
        const stats = apiData[key];
        const g = stats ? stats.good : 0, n = stats ? stats.normal : 0, b = stats ? stats.bad : 0;
        const total = stats ? stats.totalVotes : 0;
        return { 
          ex: executors[key], 
          percent: stats ? stats.percent : 0, 
          totalVotes: total,
          bar: createProportionBar(g, n, b, total)
        };
      }).filter(d => d.totalVotes > 0); 

      let mobileData = allData.filter(d => d.ex.platform.includes("Mobile")).sort((a, b) => b.percent - a.percent || b.totalVotes - a.totalVotes);
      let pcData = allData.filter(d => d.ex.platform.includes("PC")).sort((a, b) => b.percent - a.percent || b.totalVotes - a.totalVotes);

      const embed = new EmbedBuilder().setTitle("🏆 Community Leaderboard").setDescription("Top trusted Executors based on community votes.").setColor("#ffcc00");

      const processLB = (dataArr) => {
        let text = "";
        dataArr.forEach((item, i) => {
          if (i < 3) {
            const rankIcon = i === 0 ? "🥇" : i === 1 ? "🥈" : "🥉";
            text += `${rankIcon} **${item.ex.name.toUpperCase()}** \n**${item.bar}** **${item.percent}%** \`[${item.totalVotes} votes]\`\n> ━━━━━━━━━━━━━━\n\n`;
          } else {
            text += `🏅 **${item.ex.name}** — **${item.percent}%** \`(${item.totalVotes} votes)\`\n\n`;
          }
        });
        return text || "No data yet";
      };

      embed.addFields(
        { name: "📱 TOP MOBILE", value: processLB(mobileData) },
        { name: "🖥️ TOP PC", value: processLB(pcData) }
      );

      await interaction.editReply({ embeds: [embed] });
      return autoDelete(interaction);
    }

    if (interaction.customId.startsWith("vote_")) {
      const [, type, name] = interaction.customId.split("_"); 
      await interaction.deferUpdate();

      try {
        const res = await fetch(API_URL + "vote", {
            method: "POST", headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ name, type, user: interaction.user.id })
        });
        const response = await res.json();

        if (!response.success) {
            const errEmbed = new EmbedBuilder()
              .setTitle("🛑 Anti-Spam / Cooldown Active")
              .setDescription(response.error)
              .setColor("#ff3333");
            await interaction.editReply({ content: null, embeds: [errEmbed], components: [] });
            return autoDelete(interaction, 15000); 
        }

        cache.lastFetch = 0; 
        const freshDataRes = await fetchAllData(); 
        const freshStats = freshDataRes.success && freshDataRes.data[name] ? freshDataRes.data[name] : null;
        
        const newTotal = freshStats ? freshStats.totalVotes : "?";
        const newScore = freshStats ? freshStats.percent : "?";
        const historyData = freshStats && freshStats.history ? freshStats.history : [];

        let chartUrl = null;
        if (historyData.length > 0) {
          const labels = historyData.map(h => h.date.slice(-5)); 
          const dataPoints = historyData.map(h => h.score);
          
          const chartConfig = {
            type: 'line',
            data: {
              labels: labels,
              datasets: [{
                label: 'Trust Score 7 Days',
                data: dataPoints,
                borderColor: '#00ff99',
                backgroundColor: 'rgba(0, 255, 153, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
              }]
            },
            options: {
              legend: { display: false },
              scales: { yAxes: [{ ticks: { min: 0, max: 100 } }] }
            }
          };
          chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=400&h=200`;
        }

        const feedbackObj = voteFeedback[type];
        const randomMsg = feedbackObj.msgs[Math.floor(Math.random() * feedbackObj.msgs.length)];
        const voteColor = type === "good" ? "#00ff99" : type === "normal" ? "#ffcc00" : "#ff3333";

        const successEmbed = new EmbedBuilder()
            .setTitle(`${feedbackObj.emoji} Vote Successful & Logged!`)
            .setDescription(`**${randomMsg}**\n\nThank you <@${interaction.user.id}>! You voted **${type.toUpperCase()}** for **${executors[name].name}**.\n*(Server has recorded your Audit Log & Cooldown timer started)*\n\n📈 **Live Stats for ${executors[name].name}:**\n> Trust Score: **${newScore}%**\n> Total Votes: **${newTotal}**\n\n*(Auto-deletes in 25 seconds)*`)
            .setColor(voteColor);

        if (chartUrl) {
          successEmbed.setImage(chartUrl);
        } else {
          successEmbed.setImage(feedbackObj.gif); 
        }

        await interaction.editReply({ content: null, embeds: [successEmbed], components: [] });
        return autoDelete(interaction, 25000);

      } catch (error) {
          const errEmbed = new EmbedBuilder().setTitle("🚨 Connection Error").setDescription("Could not connect to the database.").setColor("#ff3333");
          await interaction.editReply({ content: null, embeds: [errEmbed], components: [] });
          return autoDelete(interaction, 10000);
      }
    }
  } // <======= CHÍNH LÀ DẤU NGOẶC ĐÓNG CỦA if (interaction.isButton()) Ở ĐÂY

  // ================= EXECUTOR SELECTION MENU =================
  if (interaction.isStringSelectMenu() && interaction.customId === "select_vote_executor") {
    const key = interaction.values[0];
    const exName = executors[key].name;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`vote_good_${key}`).setLabel("Working").setEmoji("🟢").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`vote_normal_${key}`).setLabel("Issues").setEmoji("🟡").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`vote_bad_${key}`).setLabel("Patched/Ban").setEmoji("🔴").setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle(`🗳️ Rate: ${exName}`)
      .setDescription(`What is the current status of **${exName}**?\n\n🟢 **Working**: Scripts run smoothly.\n🟡 **Issues**: Crashing, minor bugs.\n🔴 **Patched/Ban**: Completely patched, causes bans.`)
      .setColor("#ffcc00");

    await interaction.update({ content: null, embeds: [embed], components: [row] });
  }
});

client.login(process.env.TOKEN);
