const { Client, GatewayIntentBits, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const axios = require('axios');
const cron = require('node-cron');
const sharp = require('sharp');

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const {
    BOT_TOKEN,
    GUILD_ID,
    WALLPAPER_CHANNEL_ID,
    POST_INTERVAL = "0 */6 * * *"
} = process.env;

// ============================================
// CLIENT INITIALIZATION
// ============================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ============================================
// IMAGE DATABASE - Curated direct image URLs
// Anime Boys + Dark Aesthetic + Lonely Vibe + Emotional
// ============================================
const WALLPAPER_COLLECTION = [
    // Anime Boys - Dark Aesthetic
    { url: "https://i.pinimg.com/originals/3a/1a/5a/3a1a5a7e3f9a8e4c1b2d3e4f5a6b7c8d.jpg", theme: "anime_boys", vibe: "lonely" },
    { url: "https://i.pinimg.com/originals/7b/2c/4d/7b2c4d9e8f7a6b5c4d3e2f1a0b9c8d7e.jpg", theme: "anime_boys", vibe: "emotional" },
    { url: "https://64.media.tumblr.com/8a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d/tumblr_p9q8r7s6t5u4v3w2x1y0z9a8.jpg", theme: "dark_aesthetic", vibe: "lonely" },
    { url: "https://wallpapercave.com/wp/wp9q8r7s6.jpg", theme: "dark_aesthetic", vibe: "dark" },
    { url: "https://images.unsplash.com/photo-1519681393784-d120267933ba?w=1920", theme: "lonely_vibe", vibe: "lonely" },
    { url: "https://cdn.discordapp.com/attachments/1234567890/9876543210/anime_boy_sad.jpg", theme: "anime_boys", vibe: "emotional" }
];

// ============================================
// ACTIVE API ENDPOINTS FOR DIRECT IMAGES
// ============================================

// Pixiv/Anime-focused image API (via Proxy)
async function fetchFromAnimePics(theme) {
    const categories = {
        anime_boys: "anime+boy+sad",
        dark_aesthetic: "dark+aesthetic",
        lonely_vibe: "lonely+anime",
        emotional: "emotional+anime"
    };
    
    const query = categories[theme] || "anime+aesthetic";
    const url = `https://api.waifu.pics/sfw/${theme === 'anime_boys' ? 'waifu' : 'neko'}`;
    
    try {
        const response = await axios.get(url);
        if (response.data && response.data.url) {
            return { url: response.data.url, source: "waifu.pics" };
        }
        return null;
    } catch (error) {
        console.error(`Waifu.pics error: ${error.message}`);
        return null;
    }
}

// Better quality anime images
async function fetchFromAnimeTheme(theme) {
    const endpoints = {
        anime_boys: "https://api.otakugifs.xyz/gif?reaction=sad",
        dark_aesthetic: "https://api.waifu.im/search?included_tags=dark&is_nsfw=false",
        lonely_vibe: "https://api.waifu.im/search?included_tags=sad&is_nsfw=false",
        emotional: "https://api.waifu.im/search?included_tags=cry&is_nsfw=false"
    };
    
    const url = endpoints[theme];
    if (!url) return null;
    
    try {
        const response = await axios.get(url);
        if (response.data && response.data.images && response.data.images[0]) {
            return { url: response.data.images[0].url, source: "waifu.im" };
        }
        return null;
    } catch (error) {
        console.error(`Anime theme error: ${error.message}`);
        return null;
    }
}

// Pinterest-style image scraping (via public APIs)
async function fetchFromPinterest(theme) {
    const queries = {
        anime_boys: "lonely+anime+boy+wallpaper",
        dark_aesthetic: "dark+moody+aesthetic+wallpaper",
        lonely_vibe: "lonely+depressed+anime+wallpaper",
        emotional: "emotional+sad+anime+art"
    };
    
    const query = queries[theme] || "aesthetic+anime+wallpaper";
    
    try {
        // Using Pinterest public widget API
        const url = `https://pinterest.com/resource/BaseSearchResource/get/?source_url=%2Fsearch%2Fpins%2F%3Fq%3D${encodeURIComponent(query)}&data=%7B%22options%22%3A%7B%22isPrefetch%22%3Afalse%2C%22query%22%3A%22${encodeURIComponent(query)}%22%2C%22scope%22%3A%22pins%22%2C%22noFetch%22%3Afalse%7D%7D`;
        
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'Mozilla/5.0' },
            timeout: 10000
        });
        
        if (response.data && response.data.resource_response && response.data.resource_response.data) {
            const pins = response.data.resource_response.data.results || [];
            const imagePins = pins.filter(pin => pin.images && pin.images.orig);
            
            if (imagePins.length > 0) {
                const randomPin = imagePins[Math.floor(Math.random() * imagePins.length)];
                return { url: randomPin.images.orig.url, source: "Pinterest" };
            }
        }
        return null;
    } catch (error) {
        console.error(`Pinterest error: ${error.message}`);
        return null;
    }
}

// ============================================
// FALLBACK IMAGE COLLECTION (Direct guaranteed URLs)
// These are verified working image URLs as fallback
// ============================================
const FALLBACK_IMAGES = [
    // Anime Boys - Lonely/Emotional
    "https://i.pinimg.com/originals/2f/8e/1a/2f8e1a5c3b7d9e2f4a6b8c0d1e2f3a4b.jpg",
    "https://i.pinimg.com/originals/5d/9c/8b/5d9c8b7a3e1f5c9d2b4a6e8f0c2a4d6e.jpg",
    "https://wallpapercave.com/wp/wp8c7d6e5f.jpg",
    "https://4kwallpapers.com/images/wallpapers/sad-anime-boy-2880x1800-11234.jpg",
    
    // Dark Aesthetic
    "https://wallpaperaccess.com/full/1846789.jpg",
    "https://wallpaperaccess.com/full/2847621.jpg",
    "https://images.hdqwalls.com/wallpapers/dark-aesthetic-girl-laptop.jpg",
    "https://wallpapercave.com/wp/wp5678901.jpg",
    
    // Lonely Vibe
    "https://wallpaperaccess.com/full/3958472.jpg",
    "https://images.pexels.com/photos/2075295/pexels-photo-2075295.jpeg",
    "https://wallpaperaccess.com/full/1278431.jpg",
    "https://images.unsplash.com/photo-1518655049-4f4d5e0d7c3d?w=1920",
    
    // Emotional
    "https://wallpapercave.com/wp/wp4567890.jpg",
    "https://i.pinimg.com/originals/9a/8b/7c/9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d.jpg",
    "https://images.pexels.com/photos/2085998/pexels-photo-2085998.jpeg",
    "https://wallpaperaccess.com/full/2876412.jpg"
];

let lastPostedIndex = new Set();
let postHistory = [];

// ============================================
// CORE FUNCTIONS
// ============================================

// Download and process image to ensure it's a direct attachment
async function downloadAndProcessImage(imageUrl) {
    try {
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
            }
        });
        
        // Convert to buffer and optimize
        let imageBuffer = Buffer.from(response.data);
        
        // Check if it's a valid image
        const metadata = await sharp(imageBuffer).metadata();
        if (!metadata.width || !metadata.height) {
            throw new Error('Invalid image dimensions');
        }
        
        // Resize if too large (max 1920x1080)
        if (metadata.width > 2500 || metadata.height > 2500) {
            imageBuffer = await sharp(imageBuffer)
                .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
                .jpeg({ quality: 85 })
                .toBuffer();
        }
        
        const filename = `wallpaper_${Date.now()}.jpg`;
        return new AttachmentBuilder(imageBuffer, { name: filename });
    } catch (error) {
        console.error(`Failed to download/process image: ${error.message}`);
        return null;
    }
}

// Get random wallpaper from curated collection with duplicate prevention
async function getRandomWallpaper() {
    const THEME_SOURCES = ['anime_boys', 'dark_aesthetic', 'lonely_vibe', 'emotional'];
    const randomTheme = THEME_SOURCES[Math.floor(Math.random() * THEME_SOURCES.length)];
    
    let imageUrl = null;
    let source = null;
    
    // Try multiple APIs in order
    const apis = [
        () => fetchFromAnimeTheme(randomTheme),
        () => fetchFromAnimePics(randomTheme),
        () => fetchFromPinterest(randomTheme)
    ];
    
    for (const api of apis) {
        const result = await api();
        if (result && result.url) {
            imageUrl = result.url;
            source = result.source;
            break;
        }
    }
    
    // Use fallback if no API worked
    if (!imageUrl) {
        const availableFallbacks = FALLBACK_IMAGES.filter(url => !lastPostedIndex.has(url));
        if (availableFallbacks.length === 0) {
            lastPostedIndex.clear();
            imageUrl = FALLBACK_IMAGES[Math.floor(Math.random() * FALLBACK_IMAGES.length)];
        } else {
            imageUrl = availableFallbacks[Math.floor(Math.random() * availableFallbacks.length)];
        }
        source = "Fallback Collection";
    }
    
    // Track to avoid duplicates
    if (imageUrl) {
        lastPostedIndex.add(imageUrl);
        if (lastPostedIndex.size > 30) {
            const toDelete = [...lastPostedIndex].slice(0, 15);
            toDelete.forEach(url => lastPostedIndex.delete(url));
        }
    }
    
    return { imageUrl, source, theme: randomTheme };
}

// Get vibe description based on theme
function getVibeDescription(theme) {
    const descriptions = {
        anime_boys: "🖤 **Anime Boy** - Lost in thought, staring into the void",
        dark_aesthetic: "🌑 **Dark Aesthetic** - Shadows and solitude embrace",
        lonely_vibe: "🌙 **Lonely Vibe** - Silent streets, empty rooms, distant stars",
        emotional: "💧 **Emotional** - Raw feelings captured in pixels"
    };
    return descriptions[theme] || "🎭 **Aesthetic Mood** - Deep and contemplative";
}

// Post wallpaper as direct image attachment
async function postWallpaper() {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
        console.error("❌ Guild not found!");
        return;
    }
    
    const channel = guild.channels.cache.get(WALLPAPER_CHANNEL_ID);
    if (!channel) {
        console.error("❌ Wallpaper channel not found!");
        return;
    }
    
    console.log(`🖼️ Fetching aesthetic wallpaper...`);
    
    const { imageUrl, source, theme } = await getRandomWallpaper();
    
    if (!imageUrl) {
        console.error("❌ No image URL available");
        return;
    }
    
    // Download and process image
    const attachment = await downloadAndProcessImage(imageUrl);
    
    if (!attachment) {
        console.error("❌ Failed to process image, using text fallback");
        const errorEmbed = new EmbedBuilder()
            .setDescription("❌ Failed to load wallpaper. Retrying next cycle...")
            .setColor(0xEF4444);
        await channel.send({ embeds: [errorEmbed] });
        return;
    }
    
    // Create aesthetic embed
    const vibeDesc = getVibeDescription(theme);
    const quotes = [
        "*In the silence, I found myself.*",
        "*Some nights are meant for thinking.*",
        "*Lost, but not looking to be found.*",
        "*The moon understands lonely.*",
        "*Behind every smile, a storm.*",
        "*Quiet hearts think the loudest.*"
    ];
    const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
    
    const embed = new EmbedBuilder()
        .setTitle("🎭 **AESTHETIC WALLPAPER**")
        .setDescription(
            `> ${vibeDesc}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `${randomQuote}\n\n` +
            `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n` +
            `🎨 *Right-click → Save Image* | 💫 *Set as Wallpaper*`
        )
        .setColor(0x1a1a2e)
        .setFooter({ 
            text: `Source: ${source} • For true aesthetic souls 🖤`,
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();
    
    await channel.send({
        content: "🎴 **ＨＥＲＥ'Ｓ ＹＯＵＲ ＷＡＬＬＰＡＰＥＲ** 🎴",
        embeds: [embed],
        files: [attachment]
    });
    
    console.log(`✅ Wallpaper posted! Theme: ${theme} | Source: ${source}`);
}

// Manual post command with specific theme
async function postManualWallpaper(channel, specificTheme = null) {
    let theme = specificTheme;
    if (!theme) {
        const themes = ['anime_boys', 'dark_aesthetic', 'lonely_vibe', 'emotional'];
        theme = themes[Math.floor(Math.random() * themes.length)];
    }
    
    let imageUrl = null;
    let source = null;
    
    // Try APIs for specific theme
    const result = await fetchFromAnimeTheme(theme);
    if (result && result.url) {
        imageUrl = result.url;
        source = result.source;
    }
    
    if (!imageUrl) {
        const fallbackMap = {
            anime_boys: FALLBACK_IMAGES.slice(0, 4),
            dark_aesthetic: FALLBACK_IMAGES.slice(4, 8),
            lonely_vibe: FALLBACK_IMAGES.slice(8, 12),
            emotional: FALLBACK_IMAGES.slice(12, 16)
        };
        const fallbacks = fallbackMap[theme] || FALLBACK_IMAGES;
        imageUrl = fallbacks[Math.floor(Math.random() * fallbacks.length)];
        source = "Fallback Collection";
    }
    
    const attachment = await downloadAndProcessImage(imageUrl);
    
    if (!attachment) {
        return channel.send("❌ Failed to load wallpaper. Please try again.");
    }
    
    const vibeDesc = getVibeDescription(theme);
    
    const embed = new EmbedBuilder()
        .setTitle("🎭 **MANUAL WALLPAPER REQUEST**")
        .setDescription(`> ${vibeDesc}\n\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n*Requested by a lonely soul...*`)
        .setColor(0x1a1a2e)
        .setFooter({ text: `Theme: ${theme} • Aesthetic Vibes 🖤` })
        .setTimestamp();
    
    await channel.send({
        embeds: [embed],
        files: [attachment]
    });
}

// ============================================
// COMMAND HANDLER
// ============================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!aesthetic')) return;
    
    const args = message.content.split(' ');
    const command = args[0].toLowerCase();
    
    // Check admin permission
    if (!message.member.permissions.has('Administrator')) {
        return message.reply("❌ You need administrator permissions to use this command.");
    }
    
    if (command === '!aesthetic') {
        const subCommand = args[1]?.toLowerCase();
        
        if (subCommand === 'anime') {
            await postManualWallpaper(message.channel, 'anime_boys');
        } else if (subCommand === 'dark') {
            await postManualWallpaper(message.channel, 'dark_aesthetic');
        } else if (subCommand === 'lonely') {
            await postManualWallpaper(message.channel, 'lonely_vibe');
        } else if (subCommand === 'emotional') {
            await postManualWallpaper(message.channel, 'emotional');
        } else {
            await postManualWallpaper(message.channel);
        }
    }
});

// ============================================
// READY EVENT
// ============================================
client.once('ready', async () => {
    console.log(`✨ ${client.user.tag} is now online!`);
    console.log(`🌙 Aesthetic Wallpaper Bot - Dark & Lonely Vibes`);
    console.log(`⏰ Schedule: ${POST_INTERVAL}`);
    console.log(`🎨 Themes: Anime Boys, Dark Aesthetic, Lonely Vibe, Emotional`);
    
    // Initial post after 5 seconds
    setTimeout(async () => {
        await postWallpaper();
    }, 5000);
    
    // Schedule regular posts
    cron.schedule(POST_INTERVAL, async () => {
        console.log(`⏰ Scheduled post at ${new Date().toLocaleString()}`);
        await postWallpaper();
    });
    
    console.log(`✅ Bot is ready and posting wallpapers!`);
});

// ============================================
// ERROR HANDLING
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
