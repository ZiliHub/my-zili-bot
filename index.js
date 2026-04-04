const {
  Client, GatewayIntentBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder, StringSelectMenuBuilder, Events
} = require('discord.js');
const mongoose = require('mongoose');

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// 👑 DANH SÁCH ROLE ĐƯỢC BYPASS COOLDOWN
const VIP_ROLES = ["1488451031900885043", "1484339345182822480", "1484339394604306522"];

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

// ================= THIẾT LẬP MONGODB =================
mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })
  .then(() => console.log('✅ Connected to MongoDB Atlas!'))
  .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Schema Stats & History
const ExecutorSchema = new mongoose.Schema({
  nameId: { type: String, required: true, unique: true },
  good: { type: Number, default: 0 },
  normal: { type: Number, default: 0 },
  bad: { type: Number, default: 0 },
  totalVotes: { type: Number, default: 0 },
  percent: { type: Number, default: 50 },
  status: { type: String, default: '⚪ UNKNOWN' },
  history: { type: Array, default: [] }
});
const ExecutorModel = mongoose.model('Executor', ExecutorSchema);

// Schema Cooldown
const CooldownSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  expiresAt: { type: Number, required: true }
});
const CooldownModel = mongoose.model('Cooldown', CooldownSchema);

// Schema Audit Logs
const AuditLogSchema = new mongoose.Schema({
  user: String, executor: String, voteType: String, time: { type: Date, default: Date.now }
});
const AuditLogModel = mongoose.model('AuditLog', AuditLogSchema);

// Lấy toàn bộ dữ liệu từ Mongo
async function fetchAllData() {
  try {
    const docs = await ExecutorModel.find();
    let data = {};
    docs.forEach(doc => { data[doc.nameId] = doc; });
    return { success: true, data };
  } catch (e) {
    return { success: false, error: "Database fetching failed." };
  }
}

// 🎨 GIAO DIỆN & MÀU SẮC
function getDynamicColor(score, total) {
  if (total === 0) return "#808080"; 
  if (score >= 80) return "#00ff99"; 
  if (score >= 40) return "#ffcc00"; 
  return "#ff3333"; 
}

function createProportionBar(percent) {
  let filledCount = Math.round(percent / 10);
  filledCount = Math.max(0, Math.min(10, filledCount)); 
  let emptyCount = 10 - filledCount;
  let filledIcon = "🟩"; 
  if (percent < 40) filledIcon = "🟥"; 
  else if (percent < 80) filledIcon = "🟨"; 
  let emptyIcon = "⬜";
  return `\`[${filledIcon.repeat(filledCount)}${emptyIcon.repeat(emptyCount)}]\``;
}

const autoDelete = (interaction, ms = 20000) => {
  setTimeout(() => interaction.deleteReply().catch(() => {}), ms);
};

const voteFeedback = {
  good: { emoji: "🎉", msgs: ["Awesome! Thanks for keeping the community updated!", "Legend! Smooth working executor confirmed."], gif: "https://media.giphy.com/media/11ISwbgCxEzMyY/giphy.gif" },
  mid: { emoji: "⚠️", msgs: ["Noted! Devs need to patch those bugs soon.", "Heads up recorded! Expect some crashes."], gif: "https://media.giphy.com/media/1FqEpoDU0FqAE/giphy.gif" },
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

    // ================= NÚT VOTE MENU =================
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
            if (stats && stats.totalVotes > 0) desc += ` | Score: ${stats.percent}% | Votes: ${stats.totalVotes}`;
            else desc += ` | Unrated (Base: ${executors[key].baseScore}%)`;

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

    // ================= NÚT PANEL =================
    if (interaction.customId === "btn_panel") {
      await interaction.deferReply({ ephemeral: true });
      const apiRes = await fetchAllData();
      if (!apiRes.success) return interaction.editReply({ embeds: [new EmbedBuilder().setTitle("🚨 API Error").setDescription(apiRes.error).setColor("#ff3333")] }).then(() => autoDelete(interaction));

      const apiData = apiRes.data;
      let allData = Object.keys(executors).map(key => {
        const ex = executors[key];
        const stats = apiData[key];
        const status = stats && stats.totalVotes > 0 ? stats.status : ex.base;
        const percent = stats && stats.totalVotes > 0 ? stats.percent : ex.baseScore;
        const g = stats ? stats.good : 0, n = stats ? stats.normal : 0, b = stats ? stats.bad : 0; 
        const totalVotes = stats ? stats.totalVotes : 0;
        
        const miniChart = totalVotes > 0 ? `\`👍 ${g} | 🟡 ${n} | 🔴 ${b}\`` : `\`No votes yet\``;
        const bar = createProportionBar(percent);

        return { key, ex, status, percent, totalVotes, miniChart, bar };
      });

      allData.sort((a, b) => b.percent - a.percent || b.totalVotes - a.totalVotes);
      const panelColor = getDynamicColor(allData[0]?.percent || 0, allData[0]?.totalVotes || 1);

      const embed = new EmbedBuilder().setTitle("📊 Current Executor Status").setDescription("Live MongoDB tracking.\n🟩 Good | 🟨 Mid | 🟥 Bad *(Auto-deletes in 20s)*").setColor(panelColor);

      const processCategory = (dataArray) => {
        let text = "";
        dataArray.forEach((item, index) => {
          if (index < 3) {
            const rankIcon = index === 0 ? "🥇" : index === 1 ? "🥈" : "🥉";
            text += `${rankIcon} **${item.ex.name.toUpperCase()}**\n╰ 📊 **Trust:** ${item.bar} **${item.percent}%**\n╰ 📈 **Stats:** ${item.miniChart}\n╰ ⚙️ **Status:** ${item.status}\n━━━━━━━━━━━━━━━━━━━━━━\n`;
          } else {
            text += `🔹 **${item.ex.name}** — ${item.miniChart}\n╰ Trust: **${item.percent}%** | ${item.status}\n\n`;
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

    // ================= NÚT LEADERBOARD =================
    if (interaction.customId === "btn_lb") {
      await interaction.deferReply({ ephemeral: true });
      const apiRes = await fetchAllData();
      if (!apiRes.success) return interaction.editReply({ embeds: [new EmbedBuilder().setTitle("🚨 Error").setDescription(apiRes.error).setColor("#ff3333")] }).then(() => autoDelete(interaction));

      const apiData = apiRes.data;
      let allData = Object.keys(executors).map(key => {
        const stats = apiData[key];
        const total = stats ? stats.totalVotes : 0;
        const currentPercent = stats ? stats.percent : executors[key].baseScore;
        return { ex: executors[key], percent: currentPercent, totalVotes: total, bar: createProportionBar(currentPercent) };
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
          } else text += `🏅 **${item.ex.name}** — **${item.percent}%** \`(${item.totalVotes} votes)\`\n\n`;
        });
        return text || "No data yet";
      };

      embed.addFields({ name: "📱 TOP MOBILE", value: processLB(mobileData) }, { name: "🖥️ TOP PC", value: processLB(pcData) });
      await interaction.editReply({ embeds: [embed] });
      return autoDelete(interaction);
    }

    // ================= XỬ LÝ VOTE VÀO DATABASE =================
    if (interaction.customId.startsWith("vote_")) {
      const [, type, name] = interaction.customId.split("_"); 
      await interaction.deferUpdate();

      try {
        const userId = interaction.user.id;
        const hasVipRole = interaction.member && interaction.member.roles.cache.some(role => VIP_ROLES.includes(role.id));
        const voteType = type === "mid" ? "normal" : type;

        // 1. KIỂM TRA COOLDOWN
        if (!hasVipRole) {
          const cd = await CooldownModel.findOne({ userId });
          if (cd && cd.expiresAt > Date.now()) {
            const timeLeft = cd.expiresAt - Date.now();
            const hours = Math.floor(timeLeft / 3600000);
            const minutes = Math.floor((timeLeft % 3600000) / 60000);
            const errEmbed = new EmbedBuilder().setTitle("🛑 Cooldown Active").setDescription(`⏳ You have already voted today!\nPlease wait **${hours}h ${minutes}m** before voting again.`).setColor("#ff3333");
            await interaction.editReply({ content: null, embeds: [errEmbed], components: [] });
            return autoDelete(interaction, 15000);
          }
        }

        // 2. LẤY & CẬP NHẬT STATS
        let exData = await ExecutorModel.findOne({ nameId: name });
        if (!exData) exData = new ExecutorModel({ nameId: name });

        exData[voteType] += 1;
        exData.totalVotes += 1;

        // TÍNH ĐIỂM BAYESIAN CHUẨN XÁC THEO LOGIC CŨ CỦA BẠN
        const totalActualPoints = (exData.good * 100) + (exData.normal * 50) + (exData.bad * 0);
        const CONST_VOTES = 5; 
        const CONST_SCORE = 50; 
        exData.percent = Math.round((totalActualPoints + (CONST_VOTES * CONST_SCORE)) / (exData.totalVotes + CONST_VOTES));

        if (exData.percent >= 80) exData.status = "🟢 FULL SUPPORT";
        else if (exData.percent >= 40) exData.status = "🟡 LIMITED";
        else exData.status = "🔴 NOT SUPPORT";

        // CẬP NHẬT HISTORY
        const today = new Date().toISOString().split('T')[0];
        const todayRecordIndex = exData.history.findIndex(h => h.date === today);
        if (todayRecordIndex > -1) {
          exData.history[todayRecordIndex].score = exData.percent;
        } else {
          exData.history.push({ date: today, score: exData.percent });
        }
        if (exData.history.length > 7) exData.history.shift();

        // 3. LƯU VÀO DATABASE MONGODB
        await exData.save();

        if (!hasVipRole) {
          await CooldownModel.findOneAndUpdate(
            { userId }, 
            { expiresAt: Date.now() + 86400000 }, 
            { upsert: true }
          );
        }

        await new AuditLogModel({ user: userId, executor: name, voteType: type }).save();

        // 4. TẠO CHART VÀ TRẢ LỜI NGƯỜI DÙNG
        let chartUrl = null;
        if (exData.history.length > 0) {
          const labels = exData.history.map(h => h.date.slice(-5)); 
          const dataPoints = exData.history.map(h => h.score);
          const chartConfig = {
            type: 'line', data: { labels: labels, datasets: [{ label: 'Trust Score 7 Days', data: dataPoints, borderColor: '#00ff99', backgroundColor: 'rgba(0, 255, 153, 0.1)', borderWidth: 2, fill: true, tension: 0.4 }] },
            options: { legend: { display: false }, scales: { yAxes: [{ ticks: { min: 0, max: 100 } }] } }
          };
          chartUrl = `https://quickchart.io/chart?c=${encodeURIComponent(JSON.stringify(chartConfig))}&w=400&h=200`;
        }

        const feedbackObj = voteFeedback[type];
        const randomMsg = feedbackObj.msgs[Math.floor(Math.random() * feedbackObj.msgs.length)];
        const voteColor = type === "good" ? "#00ff99" : type === "mid" ? "#ffcc00" : "#ff3333"; 

        const successEmbed = new EmbedBuilder()
            .setTitle(`${feedbackObj.emoji} Vote Successful & Logged!`)
            .setDescription(`**${randomMsg}**\n\nThank you <@${interaction.user.id}>! You voted **${type.toUpperCase()}** for **${executors[name].name}**.\n*(Server has recorded your Audit Log & Cooldown timer started)*\n\n📈 **Live Stats for ${executors[name].name}:**\n> Trust Score: **${exData.percent}%**\n> Total Votes: **${exData.totalVotes}**\n\n*(Auto-deletes in 25 seconds)*`)
            .setColor(voteColor);

        if (hasVipRole) successEmbed.setFooter({ text: "👑 VIP Role Active: Cooldown Bypassed!" });
        if (chartUrl) successEmbed.setImage(chartUrl);
        else successEmbed.setImage(feedbackObj.gif); 

        await interaction.editReply({ content: null, embeds: [successEmbed], components: [] });
        return autoDelete(interaction, 25000);

      } catch (error) {
          console.error(error);
          const errEmbed = new EmbedBuilder().setTitle("🚨 Connection Error").setDescription("Database failed to process your vote.").setColor("#ff3333");
          await interaction.editReply({ content: null, embeds: [errEmbed], components: [] });
          return autoDelete(interaction, 10000);
      }
    }
  }

  // ================= EXECUTOR SELECTION MENU =================
  if (interaction.isStringSelectMenu() && interaction.customId === "select_vote_executor") {
    const key = interaction.values[0];
    const exName = executors[key].name;

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId(`vote_good_${key}`).setLabel("Working").setEmoji("🟢").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId(`vote_mid_${key}`).setLabel("Mid / Issues").setEmoji("🟡").setStyle(ButtonStyle.Secondary),
      new ButtonBuilder().setCustomId(`vote_bad_${key}`).setLabel("Patched/Ban").setEmoji("🔴").setStyle(ButtonStyle.Danger)
    );

    const embed = new EmbedBuilder()
      .setTitle(`🗳️ Rate: ${exName}`)
      .setDescription(`What is the current status of **${exName}**?\n\n🟢 **Working**: Scripts run smoothly.\n🟡 **Mid / Issues**: Crashing, minor bugs.\n🔴 **Patched/Ban**: Completely patched, causes bans.`)
      .setColor("#ffcc00");

    await interaction.update({ content: null, embeds: [embed], components: [row] });
  }
});

client.login(process.env.TOKEN);

// ================= GIỮ MẠNG CHO BOT TRÊN RAILWAY =================
const http = require('http');
http.createServer((req, res) => {
  res.writeHead(200, { 'Content-Type': 'text/plain' });
  res.write('Bot is running smoothly on Railway!');
  res.end();
}).listen(process.env.PORT || 8080, () => {
  console.log('🌐 Dummy Web Server is running to keep Railway happy!');
});
