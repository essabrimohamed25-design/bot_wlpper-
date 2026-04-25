const { Client, GatewayIntentBits, EmbedBuilder, Events, AuditLogEvent } = require('discord.js');

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const {
    BOT_TOKEN,
    GUILD_ID,
    
    // Log Channels
    MEMBER_JOIN_LOG_ID,
    MEMBER_LEAVE_LOG_ID,
    MESSAGE_DELETE_LOG_ID,
    MESSAGE_EDIT_LOG_ID,
    ROLE_UPDATE_LOG_ID,
    CHANNEL_LOG_ID,
    VOICE_LOG_ID,
    BAN_LOG_ID,
    TIMEOUT_LOG_ID,
    NICKNAME_LOG_ID,
    INVITE_LOG_ID,
    EMOJI_STICKER_LOG_ID,
    SERVER_UPDATE_LOG_ID
} = process.env;

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

async function sendLog(guild, channelId, embed) {
    if (!channelId) return;
    const channel = guild.channels.cache.get(channelId);
    if (channel) {
        await channel.send({ embeds: [embed] }).catch(err => console.error(`Failed to send log to ${channelId}:`, err.message));
    }
}

function getTimestamp() {
    return Math.floor(Date.now() / 1000);
}

async function getModerator(guild, action, targetId) {
    try {
        const fetchedLogs = await guild.fetchAuditLogs({
            type: action,
            limit: 5
        });
        
        const logEntry = fetchedLogs.entries.find(entry => entry.target.id === targetId);
        if (logEntry && Date.now() - logEntry.createdTimestamp < 5000) {
            return {
                id: logEntry.executor.id,
                tag: logEntry.executor.tag,
                reason: logEntry.reason || "No reason provided"
            };
        }
        return null;
    } catch (error) {
        return null;
    }
}

// ============================================
// MEMBER JOIN LOG
// ============================================
client.on('guildMemberAdd', async (member) => {
    if (member.guild.id !== GUILD_ID) return;
    
    const embed = new EmbedBuilder()
        .setTitle("👋 MEMBER JOINED")
        .setDescription(`**${member.user.tag}** has joined the server`)
        .setColor(0x22C55E)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: "User ID", value: `\`${member.user.id}\``, inline: true },
            { name: "Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: "Member Count", value: `\`${member.guild.memberCount}\``, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Joined • ${member.guild.name}`, iconURL: member.guild.iconURL() });
    
    await sendLog(member.guild, MEMBER_JOIN_LOG_ID, embed);
});

// ============================================
// MEMBER LEAVE LOG
// ============================================
client.on('guildMemberRemove', async (member) => {
    if (member.guild.id !== GUILD_ID) return;
    
    const embed = new EmbedBuilder()
        .setTitle("👋 MEMBER LEFT")
        .setDescription(`**${member.user.tag}** has left the server`)
        .setColor(0xEF4444)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: "User ID", value: `\`${member.user.id}\``, inline: true },
            { name: "Joined At", value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Unknown", inline: true },
            { name: "Member Count", value: `\`${member.guild.memberCount}\``, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `Left • ${member.guild.name}`, iconURL: member.guild.iconURL() });
    
    await sendLog(member.guild, MEMBER_LEAVE_LOG_ID, embed);
});

// ============================================
// MESSAGE DELETE LOG
// ============================================
client.on('messageDelete', async (message) => {
    if (!message.guild || message.guild.id !== GUILD_ID) return;
    if (message.author?.bot) return;
    
    const embed = new EmbedBuilder()
        .setTitle("🗑️ MESSAGE DELETED")
        .setDescription(`A message was deleted in ${message.channel}`)
        .setColor(0xF97316)
        .addFields(
            { name: "Author", value: `${message.author?.tag || "Unknown"} \`${message.author?.id || "Unknown"}\``, inline: true },
            { name: "Channel", value: `${message.channel} \`#${message.channel.name}\``, inline: true },
            { name: "Deleted Content", value: message.content?.substring(0, 1000) || "No text content (embed/attachment)", inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Message ID: ${message.id}` });
    
    if (message.attachments.size > 0) {
        const attachments = Array.from(message.attachments.values()).map(a => `[${a.name}](${a.url})`).join(", ");
        embed.addFields({ name: "Attachments", value: attachments.substring(0, 1000), inline: false });
    }
    
    await sendLog(message.guild, MESSAGE_DELETE_LOG_ID, embed);
});

// ============================================
// MESSAGE EDIT LOG
// ============================================
client.on('messageUpdate', async (oldMessage, newMessage) => {
    if (!oldMessage.guild || oldMessage.guild.id !== GUILD_ID) return;
    if (oldMessage.author?.bot) return;
    if (oldMessage.content === newMessage.content) return;
    
    const embed = new EmbedBuilder()
        .setTitle("✏️ MESSAGE EDITED")
        .setDescription(`A message was edited in ${oldMessage.channel}`)
        .setColor(0x3B82F6)
        .addFields(
            { name: "Author", value: `${oldMessage.author?.tag || "Unknown"} \`${oldMessage.author?.id || "Unknown"}\``, inline: true },
            { name: "Channel", value: `${oldMessage.channel} \`#${oldMessage.channel.name}\``, inline: true },
            { name: "Before", value: oldMessage.content?.substring(0, 500) || "Empty", inline: false },
            { name: "After", value: newMessage.content?.substring(0, 500) || "Empty", inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Message ID: ${oldMessage.id}` });
    
    await sendLog(oldMessage.guild, MESSAGE_EDIT_LOG_ID, embed);
});

// ============================================
// ROLE UPDATE LOGS (Create/Delete/Update)
// ============================================
client.on('roleCreate', async (role) => {
    if (role.guild.id !== GUILD_ID) return;
    
    const moderator = await getModerator(role.guild, AuditLogEvent.RoleCreate, role.id);
    
    const embed = new EmbedBuilder()
        .setTitle("🆕 ROLE CREATED")
        .setDescription(`A new role was created`)
        .setColor(0x22C55E)
        .addFields(
            { name: "Role Name", value: `${role.name}`, inline: true },
            { name: "Role ID", value: `\`${role.id}\``, inline: true },
            { name: "Color", value: `${role.hexColor}`, inline: true },
            { name: "Position", value: `${role.position}`, inline: true },
            { name: "Mentionable", value: role.mentionable ? "Yes" : "No", inline: true },
            { name: "Hoisted", value: role.hoist ? "Yes" : "No", inline: true }
        )
        .setTimestamp();
    
    if (moderator) {
        embed.addFields({ name: "Created By", value: `${moderator.tag} \`${moderator.id}\``, inline: false });
    }
    
    await sendLog(role.guild, ROLE_UPDATE_LOG_ID, embed);
});

client.on('roleDelete', async (role) => {
    if (role.guild.id !== GUILD_ID) return;
    
    const moderator = await getModerator(role.guild, AuditLogEvent.RoleDelete, role.id);
    
    const embed = new EmbedBuilder()
        .setTitle("🗑️ ROLE DELETED")
        .setDescription(`A role was deleted`)
        .setColor(0xEF4444)
        .addFields(
            { name: "Role Name", value: role.name, inline: true },
            { name: "Role ID", value: `\`${role.id}\``, inline: true }
        )
        .setTimestamp();
    
    if (moderator) {
        embed.addFields({ name: "Deleted By", value: `${moderator.tag} \`${moderator.id}\``, inline: false });
    }
    
    await sendLog(role.guild, ROLE_UPDATE_LOG_ID, embed);
});

client.on('roleUpdate', async (oldRole, newRole) => {
    if (oldRole.guild.id !== GUILD_ID) return;
    
    const changes = [];
    if (oldRole.name !== newRole.name) changes.push(`**Name:** ${oldRole.name} → ${newRole.name}`);
    if (oldRole.hexColor !== newRole.hexColor) changes.push(`**Color:** ${oldRole.hexColor} → ${newRole.hexColor}`);
    if (oldRole.mentionable !== newRole.mentionable) changes.push(`**Mentionable:** ${oldRole.mentionable ? "Yes" : "No"} → ${newRole.mentionable ? "Yes" : "No"}`);
    if (oldRole.hoist !== newRole.hoist) changes.push(`**Hoisted:** ${oldRole.hoist ? "Yes" : "No"} → ${newRole.hoist ? "Yes" : "No"}`);
    
    if (changes.length === 0) return;
    
    const embed = new EmbedBuilder()
        .setTitle("⚙️ ROLE UPDATED")
        .setDescription(`Role **${oldRole.name}** was modified`)
        .setColor(0xF59E0B)
        .addFields({ name: "Changes", value: changes.join("\n"), inline: false })
        .setTimestamp();
    
    await sendLog(oldRole.guild, ROLE_UPDATE_LOG_ID, embed);
});

// ============================================
// CHANNEL LOGS (Create/Delete)
// ============================================
client.on('channelCreate', async (channel) => {
    if (channel.guild.id !== GUILD_ID) return;
    
    const moderator = await getModerator(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    
    const embed = new EmbedBuilder()
        .setTitle("📝 CHANNEL CREATED")
        .setDescription(`A new channel was created`)
        .setColor(0x22C55E)
        .addFields(
            { name: "Channel Name", value: `${channel.name}`, inline: true },
            { name: "Channel ID", value: `\`${channel.id}\``, inline: true },
            { name: "Type", value: channel.type, inline: true }
        )
        .setTimestamp();
    
    if (moderator) {
        embed.addFields({ name: "Created By", value: `${moderator.tag} \`${moderator.id}\``, inline: false });
    }
    
    await sendLog(channel.guild, CHANNEL_LOG_ID, embed);
});

client.on('channelDelete', async (channel) => {
    if (channel.guild?.id !== GUILD_ID) return;
    
    const moderator = await getModerator(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
    
    const embed = new EmbedBuilder()
        .setTitle("🗑️ CHANNEL DELETED")
        .setDescription(`A channel was deleted`)
        .setColor(0xEF4444)
        .addFields(
            { name: "Channel Name", value: channel.name, inline: true },
            { name: "Channel ID", value: `\`${channel.id}\``, inline: true },
            { name: "Type", value: channel.type, inline: true }
        )
        .setTimestamp();
    
    if (moderator) {
        embed.addFields({ name: "Deleted By", value: `${moderator.tag} \`${moderator.id}\``, inline: false });
    }
    
    await sendLog(channel.guild, CHANNEL_LOG_ID, embed);
});

// ============================================
// VOICE LOGS
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
        .setTitle("🎤 VOICE UPDATE")
        .setDescription(action)
        .setColor(0x8B5CF6)
        .addFields(
            { name: "User", value: `${member.user.tag} \`${member.user.id}\``, inline: true },
            { name: "From", value: oldChannel, inline: true },
            { name: "To", value: newChannel, inline: true }
        )
        .setTimestamp();
    
    await sendLog(oldState.guild, VOICE_LOG_ID, embed);
});

// ============================================
// BAN/UNBAN LOGS
// ============================================
client.on('guildBanAdd', async (ban) => {
    if (ban.guild.id !== GUILD_ID) return;
    
    const moderator = await getModerator(ban.guild, AuditLogEvent.MemberBanAdd, ban.user.id);
    
    const embed = new EmbedBuilder()
        .setTitle("🔨 MEMBER BANNED")
        .setDescription(`**${ban.user.tag}** was banned from the server`)
        .setColor(0xEF4444)
        .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: "User ID", value: `\`${ban.user.id}\``, inline: true },
            { name: "Reason", value: moderator?.reason || "No reason provided", inline: false }
        )
        .setTimestamp();
    
    if (moderator) {
        embed.addFields({ name: "Banned By", value: `${moderator.tag} \`${moderator.id}\``, inline: false });
    }
    
    await sendLog(ban.guild, BAN_LOG_ID, embed);
});

client.on('guildBanRemove', async (ban) => {
    if (ban.guild.id !== GUILD_ID) return;
    
    const moderator = await getModerator(ban.guild, AuditLogEvent.MemberBanRemove, ban.user.id);
    
    const embed = new EmbedBuilder()
        .setTitle("✅ MEMBER UNBANNED")
        .setDescription(`**${ban.user.tag}** was unbanned from the server`)
        .setColor(0x22C55E)
        .setThumbnail(ban.user.displayAvatarURL({ dynamic: true }))
        .addFields(
            { name: "User ID", value: `\`${ban.user.id}\``, inline: true }
        )
        .setTimestamp();
    
    if (moderator) {
        embed.addFields({ name: "Unbanned By", value: `${moderator.tag} \`${moderator.id}\``, inline: false });
    }
    
    await sendLog(ban.guild, BAN_LOG_ID, embed);
});

// ============================================
// TIMEOUT LOGS
// ============================================
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (oldMember.guild.id !== GUILD_ID) return;
    if (oldMember.communicationDisabledUntil === newMember.communicationDisabledUntil) return;
    
    const wasTimedOut = oldMember.communicationDisabledUntil;
    const isTimedOut = newMember.communicationDisabledUntil;
    
    if (!wasTimedOut && isTimedOut) {
        const moderator = await getModerator(oldMember.guild, AuditLogEvent.MemberUpdate, oldMember.id);
        const embed = new EmbedBuilder()
            .setTitle("⏰ MEMBER TIMED OUT")
            .setDescription(`**${oldMember.user.tag}** was timed out`)
            .setColor(0xF97316)
            .addFields(
                { name: "User", value: `${oldMember.user.tag} \`${oldMember.user.id}\``, inline: true },
                { name: "Duration", value: `<t:${Math.floor(isTimedOut.getTime() / 1000)}:R>`, inline: true },
                { name: "Reason", value: moderator?.reason || "No reason provided", inline: false }
            )
            .setTimestamp();
        
        if (moderator) {
            embed.addFields({ name: "Moderator", value: `${moderator.tag} \`${moderator.id}\``, inline: false });
        }
        
        await sendLog(oldMember.guild, TIMEOUT_LOG_ID, embed);
    } else if (wasTimedOut && !isTimedOut) {
        const embed = new EmbedBuilder()
            .setTitle("✅ TIMEOUT REMOVED")
            .setDescription(`**${oldMember.user.tag}** is no longer timed out`)
            .setColor(0x22C55E)
            .addFields(
                { name: "User", value: `${oldMember.user.tag} \`${oldMember.user.id}\``, inline: true }
            )
            .setTimestamp();
        
        await sendLog(oldMember.guild, TIMEOUT_LOG_ID, embed);
    }
});

// ============================================
// NICKNAME CHANGE LOGS
// ============================================
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (oldMember.guild.id !== GUILD_ID) return;
    if (oldMember.nickname === newMember.nickname) return;
    
    const oldNick = oldMember.nickname || oldMember.user.username;
    const newNick = newMember.nickname || newMember.user.username;
    
    const embed = new EmbedBuilder()
        .setTitle("✏️ NICKNAME CHANGED")
        .setDescription(`**${oldMember.user.tag}** changed their nickname`)
        .setColor(0x3B82F6)
        .addFields(
            { name: "Before", value: oldNick, inline: true },
            { name: "After", value: newNick, inline: true }
        )
        .setTimestamp();
    
    await sendLog(oldMember.guild, NICKNAME_LOG_ID, embed);
});

// ============================================
// INVITE LOGS
// ============================================
let invitesCache = new Map();

client.once('ready', async () => {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) {
        const invites = await guild.invites.fetch().catch(() => null);
        if (invites) invitesCache.set(guild.id, invites);
    }
});

client.on('inviteCreate', async (invite) => {
    if (invite.guild.id !== GUILD_ID) return;
    
    const embed = new EmbedBuilder()
        .setTitle("🔗 INVITE CREATED")
        .setDescription(`A new invite was created`)
        .setColor(0x22C55E)
        .addFields(
            { name: "Code", value: invite.code, inline: true },
            { name: "Channel", value: `${invite.channel.name}`, inline: true },
            { name: "Max Uses", value: invite.maxUses === 0 ? "Unlimited" : `${invite.maxUses}`, inline: true },
            { name: "Expires", value: invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : "Never", inline: true },
            { name: "Created By", value: `${invite.inviter?.tag || "Unknown"}`, inline: false }
        )
        .setTimestamp();
    
    await sendLog(invite.guild, INVITE_LOG_ID, embed);
    
    const invites = await invite.guild.invites.fetch().catch(() => null);
    if (invites) invitesCache.set(invite.guild.id, invites);
});

client.on('inviteDelete', async (invite) => {
    if (invite.guild.id !== GUILD_ID) return;
    
    const embed = new EmbedBuilder()
        .setTitle("🗑️ INVITE DELETED")
        .setDescription(`An invite was deleted`)
        .setColor(0xEF4444)
        .addFields(
            { name: "Code", value: invite.code, inline: true },
            { name: "Channel", value: invite.channel.name, inline: true }
        )
        .setTimestamp();
    
    await sendLog(invite.guild, INVITE_LOG_ID, embed);
    
    const invites = await invite.guild.invites.fetch().catch(() => null);
    if (invites) invitesCache.set(invite.guild.id, invites);
});

// ============================================
// EMOJI/STICKER LOGS
// ============================================
client.on('emojiCreate', async (emoji) => {
    if (emoji.guild.id !== GUILD_ID) return;
    
    const moderator = await getModerator(emoji.guild, AuditLogEvent.EmojiCreate, emoji.id);
    
    const embed = new EmbedBuilder()
        .setTitle("😀 EMOJI ADDED")
        .setDescription(`A new emoji was added`)
        .setColor(0x22C55E)
        .addFields(
            { name: "Name", value: emoji.name, inline: true },
            { name: "ID", value: `\`${emoji.id}\``, inline: true },
            { name: "Animated", value: emoji.animated ? "Yes" : "No", inline: true }
        )
        .setThumbnail(emoji.url)
        .setTimestamp();
    
    if (moderator) {
        embed.addFields({ name: "Added By", value: `${moderator.tag} \`${moderator.id}\``, inline: false });
    }
    
    await sendLog(emoji.guild, EMOJI_STICKER_LOG_ID, embed);
});

client.on('emojiDelete', async (emoji) => {
    if (emoji.guild.id !== GUILD_ID) return;
    
    const moderator = await getModerator(emoji.guild, AuditLogEvent.EmojiDelete, emoji.id);
    
    const embed = new EmbedBuilder()
        .setTitle("🗑️ EMOJI REMOVED")
        .setDescription(`An emoji was removed`)
        .setColor(0xEF4444)
        .addFields(
            { name: "Name", value: emoji.name, inline: true },
            { name: "ID", value: `\`${emoji.id}\``, inline: true }
        )
        .setTimestamp();
    
    if (moderator) {
        embed.addFields({ name: "Removed By", value: `${moderator.tag} \`${moderator.id}\``, inline: false });
    }
    
    await sendLog(emoji.guild, EMOJI_STICKER_LOG_ID, embed);
});

client.on('stickerCreate', async (sticker) => {
    if (sticker.guild.id !== GUILD_ID) return;
    
    const embed = new EmbedBuilder()
        .setTitle("🏷️ STICKER ADDED")
        .setDescription(`A new sticker was added`)
        .setColor(0x22C55E)
        .addFields(
            { name: "Name", value: sticker.name, inline: true },
            { name: "ID", value: `\`${sticker.id}\``, inline: true },
            { name: "Format", value: sticker.format, inline: true }
        )
        .setTimestamp();
    
    await sendLog(sticker.guild, EMOJI_STICKER_LOG_ID, embed);
});

client.on('stickerDelete', async (sticker) => {
    if (sticker.guild.id !== GUILD_ID) return;
    
    const embed = new EmbedBuilder()
        .setTitle("🗑️ STICKER REMOVED")
        .setDescription(`A sticker was removed`)
        .setColor(0xEF4444)
        .addFields(
            { name: "Name", value: sticker.name, inline: true },
            { name: "ID", value: `\`${sticker.id}\``, inline: true }
        )
        .setTimestamp();
    
    await sendLog(sticker.guild, EMOJI_STICKER_LOG_ID, embed);
});

// ============================================
// SERVER UPDATE LOGS (Name, Icon, etc.)
// ============================================
client.on('guildUpdate', async (oldGuild, newGuild) => {
    if (oldGuild.id !== GUILD_ID) return;
    
    const changes = [];
    
    if (oldGuild.name !== newGuild.name) {
        changes.push(`**Server Name:** ${oldGuild.name} → ${newGuild.name}`);
    }
    
    if (oldGuild.iconURL() !== newGuild.iconURL()) {
        changes.push(`**Server Icon:** [View Old](${oldGuild.iconURL()}) → [View New](${newGuild.iconURL()})`);
    }
    
    if (oldGuild.bannerURL() !== newGuild.bannerURL()) {
        changes.push(`**Server Banner:** Changed`);
    }
    
    if (oldGuild.description !== newGuild.description) {
        changes.push(`**Description:** ${oldGuild.description || "None"} → ${newGuild.description || "None"}`);
    }
    
    if (changes.length === 0) return;
    
    const embed = new EmbedBuilder()
        .setTitle("🏠 SERVER UPDATED")
        .setDescription(`Server settings were modified`)
        .setColor(0xF59E0B)
        .addFields({ name: "Changes", value: changes.join("\n"), inline: false })
        .setTimestamp();
    
    await sendLog(oldGuild, SERVER_UPDATE_LOG_ID, embed);
});

// ============================================
// READY EVENT
// ============================================
client.once('ready', async () => {
    console.log(`✨ ${client.user.tag} is online!`);
    console.log(`📋 Professional Logs Bot ready`);
    console.log(`📊 Tracking logs for server ID: ${GUILD_ID}`);
    
    console.log("\n✅ Log channels configured:");
    if (MEMBER_JOIN_LOG_ID) console.log("  • Member Join Logs ✓");
    if (MEMBER_LEAVE_LOG_ID) console.log("  • Member Leave Logs ✓");
    if (MESSAGE_DELETE_LOG_ID) console.log("  • Message Delete Logs ✓");
    if (MESSAGE_EDIT_LOG_ID) console.log("  • Message Edit Logs ✓");
    if (ROLE_UPDATE_LOG_ID) console.log("  • Role Update Logs ✓");
    if (CHANNEL_LOG_ID) console.log("  • Channel Logs ✓");
    if (VOICE_LOG_ID) console.log("  • Voice Logs ✓");
    if (BAN_LOG_ID) console.log("  • Ban/Unban Logs ✓");
    if (TIMEOUT_LOG_ID) console.log("  • Timeout Logs ✓");
    if (NICKNAME_LOG_ID) console.log("  • Nickname Change Logs ✓");
    if (INVITE_LOG_ID) console.log("  • Invite Logs ✓");
    if (EMOJI_STICKER_LOG_ID) console.log("  • Emoji/Sticker Logs ✓");
    if (SERVER_UPDATE_LOG_ID) console.log("  • Server Update Logs ✓");
});

// ============================================
// ERROR HANDLING (FIXED)
// ============================================
process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

// ============================================
// LOGIN
// ============================================
client.login(BOT_TOKEN);
