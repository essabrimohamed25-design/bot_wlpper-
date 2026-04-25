const { Client, GatewayIntentBits, EmbedBuilder, AuditLogEvent } = require('discord.js');

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const { BOT_TOKEN, GUILD_ID, LOG_CHANNEL_ID } = process.env;

// ============================================
// CLIENT INITIALIZATION
// ============================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.GuildModeration,
        GatewayIntentBits.GuildEmojisAndStickers,
        GatewayIntentBits.GuildInvites
    ]
});

// ============================================
// HELPER FUNCTIONS
// ============================================
async function sendLog(guild, embed) {
    if (!LOG_CHANNEL_ID) return;
    const channel = guild.channels.cache.get(LOG_CHANNEL_ID);
    if (channel) {
        await channel.send({ embeds: [embed] }).catch(err => console.error(`Failed to send log:`, err.message));
    }
}

async function getModerator(guild, actionType, targetId, timeout = 5000) {
    try {
        const logs = await guild.fetchAuditLogs({ type: actionType, limit: 5 });
        const entry = logs.entries.find(e => e.target.id === targetId);
        if (entry && (Date.now() - entry.createdTimestamp) < timeout) {
            return { executor: entry.executor, reason: entry.reason || "No reason provided" };
        }
        return null;
    } catch (error) {
        return null;
    }
}

// ============================================
// MEMBER JOIN
// ============================================
client.on('guildMemberAdd', async (member) => {
    if (member.guild.id !== GUILD_ID) return;
    
    const embed = new EmbedBuilder()
        .setTitle("👋 Member Joined")
        .setDescription(`**${member.user.tag}** joined the server`)
        .setColor(0x22C55E)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: "User ID", value: `\`${member.user.id}\``, inline: true },
            { name: "Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: "Member Count", value: `${member.guild.memberCount}`, inline: true }
        )
        .setTimestamp();
    
    await sendLog(member.guild, embed);
});

// ============================================
// MEMBER LEAVE
// ============================================
client.on('guildMemberRemove', async (member) => {
    if (member.guild.id !== GUILD_ID) return;
    
    const embed = new EmbedBuilder()
        .setTitle("👋 Member Left")
        .setDescription(`**${member.user.tag}** left the server`)
        .setColor(0xEF4444)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: "User ID", value: `\`${member.user.id}\``, inline: true },
            { name: "Joined At", value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Unknown", inline: true },
            { name: "Member Count", value: `${member.guild.memberCount}`, inline: true }
        )
        .setTimestamp();
    
    await sendLog(member.guild, embed);
});

// ============================================
// MESSAGE DELETE
// ============================================
client.on('messageDelete', async (message) => {
    if (!message.guild || message.guild.id !== GUILD_ID) return;
    if (message.author?.bot) return;
    if (!message.content && message.attachments.size === 0) return;
    
    const embed = new EmbedBuilder()
        .setTitle("🗑️ Message Deleted")
        .setColor(0xF97316)
        .addFields(
            { name: "Author", value: `${message.author?.tag || "Unknown"} \`${message.author?.id || "Unknown"}\``, inline: false },
            { name: "Channel", value: `${message.channel.name} (${message.channel})`, inline: true },
            { name: "Message ID", value: `\`${message.id}\``, inline: true }
        )
        .setTimestamp();
    
    if (message.content) {
        embed.addFields({ name: "Content", value: message.content.substring(0, 1000), inline: false });
    }
    
    if (message.attachments.size > 0) {
        embed.addFields({ name: "Attachments", value: `${message.attachments.size} attachment(s)`, inline: false });
    }
    
    await sendLog(message.guild, embed);
});

// ============================================
// MESSAGE EDIT
// ============================================
client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!oldMessage.guild || oldMessage.guild.id !== GUILD_ID) return;
    if (oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    if (!oldMessage.content && !newMessage.content) return;
    
    const embed = new EmbedBuilder()
        .setTitle("✏️ Message Edited")
        .setColor(0x3B82F6)
        .addFields(
            { name: "Author", value: `${oldMessage.author?.tag || "Unknown"} \`${oldMessage.author?.id || "Unknown"}\``, inline: false },
            { name: "Channel", value: `${oldMessage.channel.name} (${oldMessage.channel})`, inline: true },
            { name: "Before", value: oldMessage.content?.substring(0, 500) || "(Empty)", inline: false },
            { name: "After", value: newMessage.content?.substring(0, 500) || "(Empty)", inline: false }
        )
        .setTimestamp();
    
    await sendLog(oldMessage.guild, embed);
});

// ============================================
// BAN
// ============================================
client.on('guildBanAdd', async (ban) => {
    if (ban.guild.id !== GUILD_ID) return;
    
    const audit = await getModerator(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
    
    const embed = new EmbedBuilder()
        .setTitle("🔨 Member Banned")
        .setDescription(`**${ban.user.tag}** was banned`)
        .setColor(0xEF4444)
        .setThumbnail(ban.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: "User ID", value: `\`${ban.user.id}\``, inline: true },
            { name: "Reason", value: audit?.reason || "No reason provided", inline: false }
        )
        .setTimestamp();
    
    if (audit?.executor) {
        embed.addFields({ name: "Banned By", value: `${audit.executor.tag} \`${audit.executor.id}\``, inline: false });
    }
    
    await sendLog(ban.guild, embed);
});

// ============================================
// UNBAN
// ============================================
client.on('guildBanRemove', async (ban) => {
    if (ban.guild.id !== GUILD_ID) return;
    
    const audit = await getModerator(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
    
    const embed = new EmbedBuilder()
        .setTitle("✅ Member Unbanned")
        .setDescription(`**${ban.user.tag}** was unbanned`)
        .setColor(0x22C55E)
        .setThumbnail(ban.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields({ name: "User ID", value: `\`${ban.user.id}\``, inline: true })
        .setTimestamp();
    
    if (audit?.executor) {
        embed.addFields({ name: "Unbanned By", value: `${audit.executor.tag} \`${audit.executor.id}\``, inline: false });
    }
    
    await sendLog(ban.guild, embed);
});

// ============================================
// TIMEOUT
// ============================================
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (oldMember.guild.id !== GUILD_ID) return;
    
    const wasTimedOut = oldMember.communicationDisabledUntil;
    const isTimedOut = newMember.communicationDisabledUntil;
    
    // Timeout added
    if (!wasTimedOut && isTimedOut) {
        const audit = await getModerator(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
        const duration = Math.floor((isTimedOut.getTime() - Date.now()) / 1000 / 60);
        const durationText = duration > 60 ? `${Math.floor(duration / 60)} hours` : `${duration} minutes`;
        
        const embed = new EmbedBuilder()
            .setTitle("⏰ Member Timed Out")
            .setDescription(`**${newMember.user.tag}** was timed out`)
            .setColor(0xF97316)
            .addFields(
                { name: "User", value: `${newMember.user.tag} \`${newMember.user.id}\``, inline: false },
                { name: "Duration", value: durationText, inline: true },
                { name: "Expires", value: `<t:${Math.floor(isTimedOut.getTime() / 1000)}:R>`, inline: true },
                { name: "Reason", value: audit?.reason || "No reason provided", inline: false }
            )
            .setTimestamp();
        
        if (audit?.executor) {
            embed.addFields({ name: "Moderator", value: `${audit.executor.tag} \`${audit.executor.id}\``, inline: false });
        }
        
        await sendLog(newMember.guild, embed);
    }
    
    // Timeout removed
    if (wasTimedOut && !isTimedOut) {
        const embed = new EmbedBuilder()
            .setTitle("✅ Timeout Removed")
            .setDescription(`**${newMember.user.tag}** is no longer timed out`)
            .setColor(0x22C55E)
            .addFields({ name: "User", value: `${newMember.user.tag} \`${newMember.user.id}\``, inline: false })
            .setTimestamp();
        
        await sendLog(newMember.guild, embed);
    }
});

// ============================================
// ROLE CREATE
// ============================================
client.on('roleCreate', async (role) => {
    if (role.guild.id !== GUILD_ID) return;
    
    const audit = await getModerator(role.guild, AuditLogEvent.RoleCreate, role.id);
    
    const embed = new EmbedBuilder()
        .setTitle("🆕 Role Created")
        .setColor(0x22C55E)
        .addFields(
            { name: "Role Name", value: role.name, inline: true },
            { name: "Role ID", value: `\`${role.id}\``, inline: true },
            { name: "Color", value: role.hexColor.toUpperCase(), inline: true }
        )
        .setTimestamp();
    
    if (audit?.executor) {
        embed.addFields({ name: "Created By", value: `${audit.executor.tag} \`${audit.executor.id}\``, inline: false });
    }
    
    await sendLog(role.guild, embed);
});

// ============================================
// ROLE DELETE
// ============================================
client.on('roleDelete', async (role) => {
    if (role.guild.id !== GUILD_ID) return;
    
    const audit = await getModerator(role.guild, AuditLogEvent.RoleDelete, role.id);
    
    const embed = new EmbedBuilder()
        .setTitle("🗑️ Role Deleted")
        .setColor(0xEF4444)
        .addFields(
            { name: "Role Name", value: role.name, inline: true },
            { name: "Role ID", value: `\`${role.id}\``, inline: true }
        )
        .setTimestamp();
    
    if (audit?.executor) {
        embed.addFields({ name: "Deleted By", value: `${audit.executor.tag} \`${audit.executor.id}\``, inline: false });
    }
    
    await sendLog(role.guild, embed);
});

// ============================================
// ROLE UPDATE
// ============================================
client.on('roleUpdate', async (oldRole, newRole) => {
    if (oldRole.guild.id !== GUILD_ID) return;
    
    const changes = [];
    if (oldRole.name !== newRole.name) changes.push(`**Name:** ${oldRole.name} → ${newRole.name}`);
    if (oldRole.hexColor !== newRole.hexColor) changes.push(`**Color:** ${oldRole.hexColor} → ${newRole.hexColor}`);
    if (oldRole.mentionable !== newRole.mentionable) changes.push(`**Mentionable:** ${oldRole.mentionable ? "Yes" : "No"} → ${newRole.mentionable ? "Yes" : "No"}`);
    
    if (changes.length === 0) return;
    
    const embed = new EmbedBuilder()
        .setTitle("⚙️ Role Updated")
        .setDescription(`Role **${oldRole.name}** was modified`)
        .setColor(0xF59E0B)
        .addFields({ name: "Changes", value: changes.join("\n"), inline: false })
        .setTimestamp();
    
    await sendLog(oldRole.guild, embed);
});

// ============================================
// CHANNEL CREATE
// ============================================
client.on('channelCreate', async (channel) => {
    if (channel.guild.id !== GUILD_ID) return;
    if (channel.type === 4) return;
    
    const audit = await getModerator(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    const type = channel.type === 0 ? "Text" : channel.type === 2 ? "Voice" : "Other";
    
    const embed = new EmbedBuilder()
        .setTitle("📝 Channel Created")
        .setColor(0x22C55E)
        .addFields(
            { name: "Channel Name", value: channel.name, inline: true },
            { name: "Channel ID", value: `\`${channel.id}\``, inline: true },
            { name: "Type", value: type, inline: true }
        )
        .setTimestamp();
    
    if (audit?.executor) {
        embed.addFields({ name: "Created By", value: `${audit.executor.tag} \`${audit.executor.id}\``, inline: false });
    }
    
    await sendLog(channel.guild, embed);
});

// ============================================
// CHANNEL DELETE
// ============================================
client.on('channelDelete', async (channel) => {
    if (!channel.guild || channel.guild.id !== GUILD_ID) return;
    if (channel.type === 4) return;
    
    const audit = await getModerator(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
    const type = channel.type === 0 ? "Text" : channel.type === 2 ? "Voice" : "Other";
    
    const embed = new EmbedBuilder()
        .setTitle("🗑️ Channel Deleted")
        .setColor(0xEF4444)
        .addFields(
            { name: "Channel Name", value: channel.name, inline: true },
            { name: "Channel ID", value: `\`${channel.id}\``, inline: true },
            { name: "Type", value: type, inline: true }
        )
        .setTimestamp();
    
    if (audit?.executor) {
        embed.addFields({ name: "Deleted By", value: `${audit.executor.tag} \`${audit.executor.id}\``, inline: false });
    }
    
    await sendLog(channel.guild, embed);
});

// ============================================
// VOICE UPDATES
// ============================================
client.on('voiceStateUpdate', async (oldState, newState) => {
    if (oldState.guild.id !== GUILD_ID) return;
    if (oldState.channelId === newState.channelId) return;
    
    const member = oldState.member || newState.member;
    let action = "";
    let oldChannel = oldState.channel?.name || "None";
    let newChannel = newState.channel?.name || "None";
    
    if (!oldState.channelId && newState.channelId) {
        action = `**${member.user.tag}** joined voice channel`;
    } else if (oldState.channelId && !newState.channelId) {
        action = `**${member.user.tag}** left voice channel`;
    } else {
        action = `**${member.user.tag}** moved voice channels`;
    }
    
    const embed = new EmbedBuilder()
        .setTitle("🎤 Voice Update")
        .setDescription(action)
        .setColor(0x8B5CF6)
        .addFields(
            { name: "User", value: `${member.user.tag} \`${member.user.id}\``, inline: false },
            { name: "From", value: oldChannel, inline: true },
            { name: "To", value: newChannel, inline: true }
        )
        .setTimestamp();
    
    await sendLog(oldState.guild, embed);
});

// ============================================
// NICKNAME CHANGE
// ============================================
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (oldMember.guild.id !== GUILD_ID) return;
    if (oldMember.nickname === newMember.nickname) return;
    
    const oldNick = oldMember.nickname || oldMember.user.username;
    const newNick = newMember.nickname || newMember.user.username;
    
    const embed = new EmbedBuilder()
        .setTitle("✏️ Nickname Changed")
        .setDescription(`**${oldMember.user.tag}** changed their nickname`)
        .setColor(0x3B82F6)
        .addFields(
            { name: "Before", value: oldNick, inline: true },
            { name: "After", value: newNick, inline: true }
        )
        .setTimestamp();
    
    await sendLog(oldMember.guild, embed);
});

// ============================================
// INVITE CREATE
// ============================================
client.on('inviteCreate', async (invite) => {
    if (invite.guild.id !== GUILD_ID) return;
    
    const embed = new EmbedBuilder()
        .setTitle("🔗 Invite Created")
        .setColor(0x22C55E)
        .addFields(
            { name: "Code", value: invite.code, inline: true },
            { name: "Channel", value: invite.channel.name, inline: true },
            { name: "Max Uses", value: invite.maxUses === 0 ? "Unlimited" : `${invite.maxUses}`, inline: true },
            { name: "Expires", value: invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : "Never", inline: true },
            { name: "Created By", value: invite.inviter?.tag || "Unknown", inline: false }
        )
        .setTimestamp();
    
    await sendLog(invite.guild, embed);
});

// ============================================
// INVITE DELETE
// ============================================
client.on('inviteDelete', async (invite) => {
    if (invite.guild.id !== GUILD_ID) return;
    
    const embed = new EmbedBuilder()
        .setTitle("🗑️ Invite Deleted")
        .setColor(0xEF4444)
        .addFields(
            { name: "Code", value: invite.code, inline: true },
            { name: "Channel", value: invite.channel.name, inline: true }
        )
        .setTimestamp();
    
    await sendLog(invite.guild, embed);
});

// ============================================
// EMOJI CREATE
// ============================================
client.on('emojiCreate', async (emoji) => {
    if (emoji.guild.id !== GUILD_ID) return;
    
    const audit = await getModerator(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id);
    
    const embed = new EmbedBuilder()
        .setTitle("😀 Emoji Added")
        .setColor(0x22C55E)
        .addFields(
            { name: "Name", value: emoji.name, inline: true },
            { name: "ID", value: `\`${emoji.id}\``, inline: true },
            { name: "Animated", value: emoji.animated ? "Yes" : "No", inline: true }
        )
        .setThumbnail(emoji.url)
        .setTimestamp();
    
    if (audit?.executor) {
        embed.addFields({ name: "Added By", value: `${audit.executor.tag} \`${audit.executor.id}\``, inline: false });
    }
    
    await sendLog(emoji.guild, embed);
});

// ============================================
// EMOJI DELETE
// ============================================
client.on('emojiDelete', async (emoji) => {
    if (emoji.guild.id !== GUILD_ID) return;
    
    const audit = await getModerator(emoji.guild, AuditLogEvent.EmojiDelete, emoji.id);
    
    const embed = new EmbedBuilder()
        .setTitle("🗑️ Emoji Removed")
        .setColor(0xEF4444)
        .addFields(
            { name: "Name", value: emoji.name, inline: true },
            { name: "ID", value: `\`${emoji.id}\``, inline: true }
        )
        .setTimestamp();
    
    if (audit?.executor) {
        embed.addFields({ name: "Removed By", value: `${audit.executor.tag} \`${audit.executor.id}\``, inline: false });
    }
    
    await sendLog(emoji.guild, embed);
});

// ============================================
// SERVER UPDATE
// ============================================
client.on('guildUpdate', async (oldGuild, newGuild) => {
    if (oldGuild.id !== GUILD_ID) return;
    
    const changes = [];
    if (oldGuild.name !== newGuild.name) changes.push(`**Server Name:** ${oldGuild.name} → ${newGuild.name}`);
    if (oldGuild.icon !== newGuild.icon) changes.push(`**Server Icon:** Changed`);
    if (oldGuild.description !== newGuild.description) changes.push(`**Description:** ${oldGuild.description || "None"} → ${newGuild.description || "None"}`);
    
    if (changes.length === 0) return;
    
    const embed = new EmbedBuilder()
        .setTitle("🏠 Server Updated")
        .setColor(0xF59E0B)
        .addFields({ name: "Changes", value: changes.join("\n"), inline: false })
        .setTimestamp();
    
    await sendLog(oldGuild, embed);
});

// ============================================
// READY EVENT
// ============================================
client.once('ready', async () => {
    console.log(`✨ ${client.user.tag} is online!`);
    console.log(`📋 Simple Logs Bot - Single Channel Mode`);
    console.log(`📊 Monitoring server ID: ${GUILD_ID}`);
    
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) {
        const logChannel = guild.channels.cache.get(LOG_CHANNEL_ID);
        if (logChannel) {
            console.log(`✅ Log channel: #${logChannel.name}`);
        } else {
            console.log(`⚠️ Log channel not found! Check LOG_CHANNEL_ID`);
        }
        
        const botMember = guild.members.cache.get(client.user.id);
        if (botMember && !botMember.permissions.has('ViewAuditLog')) {
            console.log("⚠️ WARNING: Bot missing 'View Audit Log' permission!");
        }
    }
    
    console.log(`\n📝 Logging all events to single channel`);
    console.log(`🚀 Bot is ready!`);
});

// ============================================
// ERROR HANDLING
// ============================================
process.on('unhandledRejection', (error) => {
    console.error('❌ Unhandled rejection:', error.message);
});

process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught exception:', error.message);
});

// ============================================
// LOGIN
// ============================================
client.login(BOT_TOKEN);
