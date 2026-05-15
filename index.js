const {
  Client,
  GatewayIntentBits,
  PermissionsBitField,
  ChannelType
} = require("discord.js")

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates
  ]
})

const prefix = "!"

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} ONLINE`)
})

client.on("messageCreate", async (message) => {

  if (message.author.bot) return
  if (!message.guild) return
  if (!message.content.startsWith(prefix)) return

  const args = message.content.slice(prefix.length).trim().split(/ +/)
  const command = args.shift().toLowerCase()

  // HELP
  if (command === "help") {

    return message.reply(`
🤖 COMMANDS

!help
!ping
!say hello
!clear 5
!server
!userinfo
!lock
!unlock
!active
!unactive
`)
  }

  // PING
  if (command === "ping") {

    return message.reply("🏓 Pong")
  }

  // SAY
  if (command === "say") {

    const text = args.join(" ")

    if (!text) {
      return message.reply("❌ Write message")
    }

    return message.channel.send(text)
  }

  // CLEAR
  if (command === "clear") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageMessages)) {
      return message.reply("❌ No permission")
    }

    const amount = parseInt(args[0])

    if (!amount) {
      return message.reply("❌ Example: !clear 5")
    }

    await message.channel.bulkDelete(amount, true)

    const msg = await message.channel.send(`✅ Deleted ${amount} messages`)

    setTimeout(() => {
      msg.delete().catch(() => {})
    }, 3000)

    return
  }

  // SERVER INFO
  if (command === "server") {

    return message.reply(`
📌 SERVER INFO

👑 Name: ${message.guild.name}
👥 Members: ${message.guild.memberCount}
🆔 ID: ${message.guild.id}
`)
  }

  // USER INFO
  if (command === "userinfo") {

    return message.reply(`
👤 USER INFO

📛 Username: ${message.author.username}
🆔 ID: ${message.author.id}
`)
  }

  // LOCK
  if (command === "lock") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply("❌ No permission")
    }

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: false
      }
    )

    return message.channel.send("🔒 Channel Locked")
  }

  // UNLOCK
  if (command === "unlock") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.ManageChannels)) {
      return message.reply("❌ No permission")
    }

    await message.channel.permissionOverwrites.edit(
      message.guild.roles.everyone,
      {
        SendMessages: true
      }
    )

    return message.channel.send("🔓 Channel Unlocked")
  }

  // ACTIVE VOICE
  if (command === "active") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ No permission")
    }

    const channels = message.guild.channels.cache.filter(
      c => c.type === ChannelType.GuildVoice
    )

    for (const [id, channel] of channels) {

      await channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        {
          UseVAD: true
        }
      )
    }

    return message.reply("✅ Voice Activity enabled in all voice channels")
  }

  // UNACTIVE VOICE
  if (command === "unactive") {

    if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
      return message.reply("❌ No permission")
    }

    const channels = message.guild.channels.cache.filter(
      c => c.type === ChannelType.GuildVoice
    )

    for (const [id, channel] of channels) {

      await channel.permissionOverwrites.edit(
        message.guild.roles.everyone,
        {
          UseVAD: false
        }
      )
    }

    return message.reply("❌ Push To Talk enabled in all voice channels")
  }

})

client.login(process.env.TOKEN)
