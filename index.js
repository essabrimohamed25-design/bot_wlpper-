const { Client, GatewayIntentBits, EmbedBuilder, AuditLogEvent } = require('discord.js');

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const {
    BOT_TOKEN,
    GUILD_ID,
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
        await channel.send({ embeds: [embed] }).catch(err => console.error(`Failed to send log:`, err.message));
    }
}

async function getAuditLogEntry(guild, actionType, targetId, timeout = 5000) {
    try {
        const fetchedLogs = await guild.fetchAuditLogs({
            type: actionType,
            limit: 10
        });
        
        const logEntry = fetchedLogs.entries.find(entry => entry.target.id === targetId);
        if (logEntry && (Date.now() - logEntry.createdTimestamp) < timeout) {
            return {
                executor: logEntry.executor,
                reason: logEntry.reason || "No reason provided",
                createdAt: logEntry.createdTimestamp
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
        .setDescription(`**${member.user.tag}** joined the server`)
        .setColor(0x22C55E)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: "User ID", value: `\`${member.user.id}\``, inline: true },
            { name: "Account Created", value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`, inline: true },
            { name: "Member Count", value: `${member.guild.memberCount} members`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `ID: ${member.user.id}` });
    
    await sendLog(member.guild, MEMBER_JOIN_LOG_ID, embed);
});

// ============================================
// MEMBER LEAVE LOG
// ============================================
client.on('guildMemberRemove', async (member) => {
    if (member.guild.id !== GUILD_ID) return;
    
    const embed = new EmbedBuilder()
        .setTitle("👋 MEMBER LEFT")
        .setDescription(`**${member.user.tag}** left the server`)
        .setColor(0xEF4444)
        .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: "User ID", value: `\`${member.user.id}\``, inline: true },
            { name: "Joined At", value: member.joinedAt ? `<t:${Math.floor(member.joinedTimestamp / 1000)}:R>` : "Unknown", inline: true },
            { name: "Member Count", value: `${member.guild.memberCount} members`, inline: true }
        )
        .setTimestamp()
        .setFooter({ text: `ID: ${member.user.id}` });
    
    await sendLog(member.guild, MEMBER_LEAVE_LOG_ID, embed);
});

// ============================================
// MESSAGE DELETE LOG
// ============================================
client.on('messageDelete', async (message) => {
    if (!message.guild || message.guild.id !== GUILD_ID) return;
    if (message.author?.bot) return;
    if (!message.content && message.attachments.size === 0) return;
    
    const embed = new EmbedBuilder()
        .setTitle("🗑️ MESSAGE DELETED")
        .setColor(0xF97316)
        .addFields(
            { name: "Author", value: `${message.author?.tag || "Unknown"} \`${message.author?.id || "Unknown"}\``, inline: false },
            { name: "Channel", value: `${message.channel.name} (${message.channel})`, inline: true },
            { name: "Message ID", value: `\`${message.id}\``, inline: true }
        )
        .setTimestamp();
    
    if (message.content) {
        embed.addFields({ name: "Content", value: message.content.substring(0, 1000) || "(Empty)", inline: false });
    }
    
    if (message.attachments.size > 0) {
        const attachments = Array.from(message.attachments.values()).map(a => `[${a.name}](${a.url})`).join("\n");
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
    if (!oldMessage.content && !newMessage.content) return;
    
    const embed = new EmbedBuilder()
        .setTitle("✏️ MESSAGE EDITED")
        .setColor(0x3B82F6)
        .addFields(
            { name: "Author", value: `${oldMessage.author?.tag || "Unknown"} \`${oldMessage.author?.id || "Unknown"}\``, inline: false },
            { name: "Channel", value: `${oldMessage.channel.name} (${oldMessage.channel})`, inline: true },
            { name: "Message ID", value: `\`${oldMessage.id}\``, inline: true },
            { name: "Before", value: oldMessage.content?.substring(0, 500) || "(Empty)", inline: false },
            { name: "After", value: newMessage.content?.substring(0, 500) || "(Empty)", inline: false }
        )
        .setTimestamp()
        .setFooter({ text: `Jump to message`, iconURL: oldMessage.author?.displayAvatarURL() });
    
    if (newMessage.url) {
        embed.setURL(newMessage.url);
    }
    
    await sendLog(oldMessage.guild, MESSAGE_EDIT_LOG_ID, embed);
});

// ============================================
// ROLE CREATE LOG
// ============================================
client.on('roleCreate', async (role) => {
    if (role.guild.id !== GUILD_ID) return;
    
    const audit = await getAuditLogEntry(role.guild, AuditLogEvent.RoleCreate, role.id);
    
    const embed = new EmbedBuilder()
        .setTitle("🆕 ROLE CREATED")
        .setColor(0x22C55E)
        .addFields(
            { name: "Role Name", value: role.name, inline: true },
            { name: "Role ID", value: `\`${role.id}\``, inline: true },
            { name: "Color", value: role.hexColor.toUpperCase(), inline: true },
            { name: "Position", value: `${role.position}`, inline: true },
            { name: "Mentionable", value: role.mentionable ? "Yes" : "No", inline: true },
            { name: "Display Separately", value: role.hoist ? "Yes" : "No", inline: true }
        )
        .setTimestamp();
    
    if (audit) {
        embed.addFields({ name: "Created By", value: `${audit.executor.tag} \`${audit.executor.id}\``, inline: false });
    }
    
    await sendLog(role.guild, ROLE_UPDATE_LOG_ID, embed);
});

// ============================================
// ROLE DELETE LOG
// ============================================
client.on('roleDelete', async (role) => {
    if (role.guild.id !== GUILD_ID) return;
    
    const audit = await getAuditLogEntry(role.guild, AuditLogEvent.RoleDelete, role.id);
    
    const embed = new EmbedBuilder()
        .setTitle("🗑️ ROLE DELETED")
        .setColor(0xEF4444)
        .addFields(
            { name: "Role Name", value: role.name, inline: true },
            { name: "Role ID", value: `\`${role.id}\``, inline: true }
        )
        .setTimestamp();
    
    if (audit) {
        embed.addFields({ name: "Deleted By", value: `${audit.executor.tag} \`${audit.executor.id}\``, inline: false });
    }
    
    await sendLog(role.guild, ROLE_UPDATE_LOG_ID, embed);
});

// ============================================
// ROLE UPDATE LOG
// ============================================
client.on('roleUpdate', async (oldRole, newRole) => {
    if (oldRole.guild.id !== GUILD_ID) return;
    
    const changes = [];
    if (oldRole.name !== newRole.name) changes.push(`**Name:** ${oldRole.name} → ${newRole.name}`);
    if (oldRole.hexColor !== newRole.hexColor) changes.push(`**Color:** ${oldRole.hexColor.toUpperCase()} → ${newRole.hexColor.toUpperCase()}`);
    if (oldRole.mentionable !== newRole.mentionable) changes.push(`**Mentionable:** ${oldRole.mentionable ? "Yes" : "No"} → ${newRole.mentionable ? "Yes" : "No"}`);
    if (oldRole.hoist !== newRole.hoist) changes.push(`**Display Separately:** ${oldRole.hoist ? "Yes" : "No"} → ${newRole.hoist ? "Yes" : "No"}`);
    if (oldRole.position !== newRole.position) changes.push(`**Position:** ${oldRole.position} → ${newRole.position}`);
    
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
// CHANNEL CREATE LOG
// ============================================
client.on('channelCreate', async (channel) => {
    if (channel.guild.id !== GUILD_ID) return;
    if (channel.type === 4) return; // Skip category channels
    
    const audit = await getAuditLogEntry(channel.guild, AuditLogEvent.ChannelCreate, channel.id);
    
    const channelType = channel.type === 0 ? "Text" : channel.type === 2 ? "Voice" : channel.type === 5 ? "Announcement" : "Unknown";
    
    const embed = new EmbedBuilder()
        .setTitle("📝 CHANNEL CREATED")
        .setColor(0x22C55E)
        .addFields(
            { name: "Channel Name", value: `${channel.name}`, inline: true },
            { name: "Channel ID", value: `\`${channel.id}\``, inline: true },
            { name: "Type", value: channelType, inline: true }
        )
        .setTimestamp();
    
    if (audit) {
        embed.addFields({ name: "Created By", value: `${audit.executor.tag} \`${audit.executor.id}\``, inline: false });
    }
    
    await sendLog(channel.guild, CHANNEL_LOG_ID, embed);
});

// ============================================
// CHANNEL DELETE LOG
// ============================================
client.on('channelDelete', async (channel) => {
    if (!channel.guild || channel.guild.id !== GUILD_ID) return;
    if (channel.type === 4) return;
    
    const audit = await getAuditLogEntry(channel.guild, AuditLogEvent.ChannelDelete, channel.id);
    
    const channelType = channel.type === 0 ? "Text" : channel.type === 2 ? "Voice" : channel.type === 5 ? "Announcement" : "Unknown";
    
    const embed = new EmbedBuilder()
        .setTitle("🗑️ CHANNEL DELETED")
        .setColor(0xEF4444)
        .addFields(
            { name: "Channel Name", value: channel.name, inline: true },
            { name: "Channel ID", value: `\`${channel.id}\``, inline: true },
            { name: "Type", value: channelType, inline: true }
        )
        .setTimestamp();
    
    if (audit) {
        embed.addFields({ name: "Deleted By", value: `${audit.executor.tag} \`${audit.executor.id}\``, inline: false });
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
            { name: "User", value: `${member.user.tag} \`${member.user.id}\``, inline: false },
            { name: "From", value: oldChannel, inline: true },
            { name: "To", value: newChannel, inline: true }
        )
        .setTimestamp();
    
    await sendLog(oldState.guild, VOICE_LOG_ID, embed);
});

// ============================================
// BAN LOG (FIXED)
// ============================================
client.on('guildBanAdd', async (ban) => {
    if (ban.guild.id !== GUILD_ID) return;
    
    // Get audit log for the ban
    let moderator = null;
    let banReason = "No reason provided";
    
    try {
        const auditLogs = await ban.guild.fetchAuditLogs({
            type: AuditLogEvent.MemberBanAdd,
            limit: 5
        });
        
        const banEntry = auditLogs.entries.find(entry => entry.target.id === ban.user.id);
        if (banEntry) {
            moderator = banEntry.executor;
            banReason = banEntry.reason || "No reason provided";
        }
    } catch (error) {
        console.error("Failed to fetch ban audit log:", error.message);
    }
    
    const embed = new EmbedBuilder()
        .setTitle("🔨 MEMBER BANNED")
        .setDescription(`**${ban.user.tag}** was banned from the server`)
        .setColor(0xEF4444)
        .setThumbnail(ban.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: "User ID", value: `\`${ban.user.id}\``, inline: true },
            { name: "Reason", value: banReason, inline: false }
        )
        .setTimestamp();
    
    if (moderator) {
        embed.addFields({ name: "Banned By", value: `${moderator.tag} \`${moderator.id}\``, inline: false });
    }
    
    await sendLog(ban.guild, BAN_LOG_ID, embed);
    console.log(`✅ Ban logged: ${ban.user.tag} was banned`);
});

// ============================================
// UNBAN LOG (FIXED)
// ============================================
client.on('guildBanRemove', async (ban) => {
    if (ban.guild.id !== GUILD_ID) return;
    
    // Get audit log for the unban
    let moderator = null;
    
    try {
        const auditLogs = await ban.guild.fetchAuditLogs({
            type: AuditLogEvent.MemberBanRemove,
            limit: 5
        });
        
        const unbanEntry = auditLogs.entries.find(entry => entry.target.id === ban.user.id);
        if (unbanEntry) {
            moderator = unbanEntry.executor;
        }
    } catch (error) {
        console.error("Failed to fetch unban audit log:", error.message);
    }
    
    const embed = new EmbedBuilder()
        .setTitle("✅ MEMBER UNBANNED")
        .setDescription(`**${ban.user.tag}** was unbanned from the server`)
        .setColor(0x22C55E)
        .setThumbnail(ban.user.displayAvatarURL({ dynamic: true, size: 256 }))
        .addFields(
            { name: "User ID", value: `\`${ban.user.id}\``, inline: true }
        )
        .setTimestamp();
    
    if (moderator) {
        embed.addFields({ name: "Unbanned By", value: `${moderator.tag} \`${moderator.id}\``, inline: false });
    }
    
    await sendLog(ban.guild, BAN_LOG_ID, embed);
    console.log(`✅ Unban logged: ${ban.user.tag} was unbanned`);
});

// ============================================
// TIMEOUT LOG (Member timed out)
// ============================================
client.on('guildMemberUpdate', async (oldMember, newMember) => {
    if (oldMember.guild.id !== GUILD_ID) return;
    
    const wasTimedOut = oldMember.communicationDisabledUntil;
    const isTimedOut = newMember.communicationDisabledUntil;
    
    // Member was timed out
    if (!wasTimedOut && isTimedOut) {
        let moderator = null;
        let timeoutReason = "No reason provided";
        
        try {
            const auditLogs = await newMember.guild.fetchAuditLogs({
                type: AuditLogEvent.MemberUpdate,
                limit: 5
            });
            
            const timeoutEntry = auditLogs.entries.find(entry => entry.target.id === newMember.id);
            if (timeoutEntry) {
                moderator = timeoutEntry.executor;
                timeoutReason = timeoutEntry.reason || "No reason provided";
            }
        } catch (error) {
            console.error("Failed to fetch timeout audit log:", error.message);
        }
        
        const duration = Math.floor((isTimedOut.getTime() - Date.now()) / 1000 / 60);
        const durationText = duration > 60 ? `${Math.floor(duration / 60)} hours` : `${duration} minutes`;
        
        const embed = new EmbedBuilder()
            .setTitle("⏰ MEMBER TIMED OUT")
            .setDescription(`**${newMember.user.tag}** was timed out`)
            .setColor(0xF97316)
            .addFields(
                { name: "User", value: `${newMember.user.tag} \`${newMember.user.id}\``, inline: false },
                { name: "Duration", value: durationText, inline: true },
                { name: "Expires", value: `<t:${Math.floor(isTimedOut.getTime() / 1000)}:R>`, inline: true },
                { name: "Reason", value: timeoutReason, inline: false }
            )
            .setTimestamp();
        
        if (moderator) {
            embed.addFields({ name: "Moderator", value: `${moderator.tag} \`${moderator.id}\``, inline: false });
        }
        
        await sendLog(newMember.guild, TIMEOUT_LOG_ID, embed);
    }
    
    // Member had timeout removed
    if (wasTimedOut && !isTimedOut) {
        const embed = new EmbedBuilder()
            .setTitle("✅ TIMEOUT REMOVED")
            .setDescription(`**${newMember.user.tag}** is no longer timed out`)
            .setColor(0x22C55E)
            .addFields(
                { name: "User", value: `${newMember.user.tag} \`${newMember.user.id}\``, inline: false }
            )
            .setTimestamp();
        
        await sendLog(newMember.guild, TIMEOUT_LOG_ID, embed);
    }
});

// ============================================
// NICKNAME CHANGE LOG
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
// INVITE CREATE LOG
// ============================================
client.on('inviteCreate', async (invite) => {
    if (invite.guild.id !== GUILD_ID) return;
    
    const embed = new EmbedBuilder()
        .setTitle("🔗 INVITE CREATED")
        .setColor(0x22C55E)
        .addFields(
            { name: "Code", value: invite.code, inline: true },
            { name: "Channel", value: invite.channel.name, inline: true },
            { name: "Max Uses", value: invite.maxUses === 0 ? "Unlimited" : `${invite.maxUses}`, inline: true },
            { name: "Expires", value: invite.expiresAt ? `<t:${Math.floor(invite.expiresAt.getTime() / 1000)}:R>` : "Never", inline: true },
            { name: "Created By", value: invite.inviter?.tag || "Unknown", inline: false }
        )
        .setTimestamp();
    
    await sendLog(invite.guild, INVITE_LOG_ID, embed);
});

// ============================================
// INVITE DELETE LOG
// ============================================
client.on('inviteDelete', async (invite) => {
    if (invite.guild.id !== GUILD_ID) return;
    
    const embed = new EmbedBuilder()
        .setTitle("🗑️ INVITE DELETED")
        .setColor(0xEF4444)
        .addFields(
            { name: "Code", value: invite.code, inline: true },
            { name: "Channel", value: invite.channel.name, inline: true }
        )
        .setTimestamp();
    
    await sendLog(invite.guild, INVITE_LOG_ID, embed);
});

// ============================================
// EMOJI CREATE LOG
// ============================================
client.on('emojiCreate', async (emoji) => {
    if (emoji.guild.id !== GUILD_ID) return;
    
    let creator = null;
    try {
        const auditLogs = await emoji.guild.fetchAuditLogs({
            type: AuditLogEvent.EmojiCreate,
            limit: 5
        });
        const emojiEntry = auditLogs.entries.find(entry => entry.target.id === emoji.id);
        if (emojiEntry) creator = emojiEntry.executor;
    } catch (error) {}
    
    const embed = new EmbedBuilder()
        .setTitle("😀 EMOJI ADDED")
        .setColor(0x22C55E)
        .addFields(
            { name: "Name", value: emoji.name, inline: true },
            { name: "ID", value: `\`${emoji.id}\``, inline: true },
            { name: "Animated", value: emoji.animated ? "Yes" : "No", inline: true }
        )
        .setThumbnail(emoji.url)
        .setTimestamp();
    
    if (creator) {
        embed.addFields({ name: "Added By", value: `${creator.tag} \`${creator.id}\``, inline: false });
    }
    
    await sendLog(emoji.guild, EMOJI_STICKER_LOG_ID, embed);
});

// ============================================
// EMOJI DELETE LOG
// ============================================
client.on('emojiDelete', async (emoji) => {
    if (emoji.guild.id !== GUILD_ID) return;
    
    let deleter = null;
    try {
        const auditLogs = await emoji.guild.fetchAuditLogs({
            type: AuditLogEvent.EmojiDelete,
            limit: 5
        });
        const emojiEntry = auditLogs.entries.find(entry => entry.target.id === emoji.id);
        if (emojiEntry) deleter = emojiEntry.executor;
    } catch (error) {}
    
    const embed = new EmbedBuilder()
        .setTitle("🗑️ EMOJI REMOVED")
        .setColor(0xEF4444)
        .addFields(
            { name: "Name", value: emoji.name, inline: true },
            { name: "ID", value: `\`${emoji.id}\``, inline: true }
        )
        .setTimestamp();
    
    if (deleter) {
        embed.addFields({ name: "Removed By", value: `${deleter.tag} \`${deleter.id}\``, inline: false });
    }
    
    await sendLog(emoji.guild, EMOJI_STICKER_LOG_ID, embed);
});

// ============================================
// STICKER CREATE LOG
// ============================================
client.on('stickerCreate', async (sticker) => {
    if (sticker.guild.id !== GUILD_ID) return;
    
    const embed = new EmbedBuilder()
        .setTitle("🏷️ STICKER ADDED")
        .setColor(0x22C55E)
        .addFields(
            { name: "Name", value: sticker.name, inline: true },
            { name: "ID", value: `\`${sticker.id}\``, inline: true },
            { name: "Format", value: sticker.format, inline: true }
        )
        .setTimestamp();
    
    await sendLog(sticker.guild, EMOJI_STICKER_LOG_ID, embed);
});

// ============================================
// STICKER DELETE LOG
// ============================================
client.on('stickerDelete', async (sticker) => {
    if (sticker.guild.id !== GUILD_ID) return;
    
    const embed = new EmbedBuilder()
        .setTitle("🗑️ STICKER REMOVED")
        .setColor(0xEF4444)
        .addFields(
            { name: "Name", value: sticker.name, inline: true },
            { name: "ID", value: `\`${sticker.id}\``, inline: true }
        )
        .setTimestamp();
    
    await sendLog(sticker.guild, EMOJI_STICKER_LOG_ID, embed);
});

// ============================================
// SERVER UPDATE LOG
// ============================================
client.on('guildUpdate', async (oldGuild, newGuild) => {
    if (oldGuild.id !== GUILD_ID) return;
    
    const changes = [];
    
    if (oldGuild.name !== newGuild.name) {
        changes.push(`**Server Name:** ${oldGuild.name} → ${newGuild.name}`);
    }
    
    if (oldGuild.icon !== newGuild.icon) {
        changes.push(`**Server Icon:** Changed`);
    }
    
    if (oldGuild.description !== newGuild.description) {
        changes.push(`**Description:** ${oldGuild.description || "None"} → ${newGuild.description || "None"}`);
    }
    
    if (oldGuild.verificationLevel !== newGuild.verificationLevel) {
        changes.push(`**Verification Level:** ${oldGuild.verificationLevel} → ${newGuild.verificationLevel}`);
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
    console.log(`📋 Professional Logs Bot - Version 2.0`);
    console.log(`📊 Monitoring server ID: ${GUILD_ID}`);
    
    // Verify bot has required permissions
    const guild = client.guilds.cache.get(GUILD_ID);
    if (guild) {
        const botMember = guild.members.cache.get(client.user.id);
        if (botMember) {
            const permissions = botMember.permissions.toArray();
            console.log(`\n✅ Bot permissions: ${permissions.length} permissions granted`);
            if (!permissions.includes('ViewAuditLog')) {
                console.warn("⚠️ WARNING: Bot missing 'View Audit Log' permission! Some logs may not work.");
            }
            if (!permissions.includes('ManageMessages')) {
                console.warn("⚠️ WARNING: Bot missing 'Manage Messages' permission!");
            }
        }
    }
    
    console.log("\n📁 Log channels configured:");
    const channels = {
        "Member Join": MEMBER_JOIN_LOG_ID,
        "Member Leave": MEMBER_LEAVE_LOG_ID,
        "Message Delete": MESSAGE_DELETE_LOG_ID,
        "Message Edit": MESSAGE_EDIT_LOG_ID,
        "Role Update": ROLE_UPDATE_LOG_ID,
        "Channel": CHANNEL_LOG_ID,
        "Voice": VOICE_LOG_ID,
        "Ban": BAN_LOG_ID,
        "Timeout": TIMEOUT_LOG_ID,
        "Nickname": NICKNAME_LOG_ID,
        "Invite": INVITE_LOG_ID,
        "Emoji/Sticker": EMOJI_STICKER_LOG_ID,
        "Server Update": SERVER_UPDATE_LOG_ID
    };
    
    for (const [name, id] of Object.entries(channels)) {
        if (id) console.log(`  ✓ ${name} Logs`);
        else console.log(`  ✗ ${name} Logs (not configured)`);
    }
    
    console.log("\n🚀 Bot is ready and logging!");
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
