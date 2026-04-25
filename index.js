const { Client, GatewayIntentBits, EmbedBuilder } = require('discord.js');
const axios = require('axios');
const cron = require('node-cron');

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const {
    BOT_TOKEN,
    GUILD_ID,
    WALLPAPER_CHANNEL_ID,
    POST_INTERVAL = "0 */6 * * *",
    CATEGORY = "all",
    API_KEY
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
// CONFIGURATION
// ============================================
const CATEGORIES = {
    gaming: "gaming",
    anime: "anime",
    cars: "cars",
    dark: "dark",
    aesthetic: "aesthetic",
    nature: "nature",
    city: "city",
    abstract: "abstract",
    all: "all"
};

const CATEGORY_EMOJIS = {
    gaming: "🎮",
    anime: "🎌",
    cars: "🏎️",
    dark: "🌙",
    aesthetic: "✨",
    nature: "🌿",
    city: "🌆",
    abstract: "🎨",
    all: "🖼️"
};

const POSTED_IMAGES = new Set(); // Track posted images to avoid duplicates

// ============================================
// WALLPAPER API FUNCTIONS
// ============================================

// Using multiple free APIs for reliability
async function fetchWallpaperFromReddit(category) {
    const subreddits = {
        gaming: "wallpaper+gaming+wallpapers",
        anime: "animewallpaper+animewallpapers",
        cars: "carporn+cardporn+wallpaper",
        dark: "darkwallpapers+dark+amoledbackgrounds",
        aesthetic: "aestheticwallpapers+outrun+vaporwaveaesthetic",
        nature: "earthporn+natureporn+landscape",
        city: "cityporn+citywallpapers+skyscrapers",
        abstract: "abstractwallpapers+abstractart+geometry",
        all: "wallpapers+wallpaper+multiwall+wallpaperdump"
    };
    
    const selectedSub = subreddits[category] || subreddits.all;
    const url = `https://www.reddit.com/r/${selectedSub}/hot.json?limit=50`;
    
    try {
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'WallpaperBot/1.0' }
        });
        
        const posts = response.data.data.children;
        const imagePosts = posts.filter(post => {
            const url = post.data.url;
            return url && (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.jpeg') || url.includes('i.redd.it') || url.includes('i.imgur.com'));
        });
        
        if (imagePosts.length === 0) return null;
        
        // Get random post that hasn't been posted recently
        const availablePosts = imagePosts.filter(post => !POSTED_IMAGES.has(post.data.url));
        if (availablePosts.length === 0) {
            POSTED_IMAGES.clear(); // Reset if all have been posted
            return imagePosts[Math.floor(Math.random() * imagePosts.length)].data;
        }
        
        const selected = availablePosts[Math.floor(Math.random() * availablePosts.length)].data;
        POSTED_IMAGES.add(selected.url);
        
        // Keep set size manageable
        if (POSTED_IMAGES.size > 200) {
            const toDelete = [...POSTED_IMAGES].slice(0, 100);
            toDelete.forEach(url => POSTED_IMAGES.delete(url));
        }
        
        return {
            title: selected.title,
            url: selected.url,
            author: selected.author,
            permalink: `https://reddit.com${selected.permalink}`,
            score: selected.score,
            upvote_ratio: selected.upvote_ratio
        };
    } catch (error) {
        console.error('Reddit API error:', error.message);
        return null;
    }
}

// Alternative: Pexels API (you can get free API key at pexels.com)
async function fetchWallpaperFromPexels(category) {
    if (!API_KEY) return null;
    
    const queries = {
        gaming: "gaming wallpaper 4k",
        anime: "anime wallpaper 4k",
        cars: "car wallpaper 4k",
        dark: "dark wallpaper 4k",
        aesthetic: "aesthetic wallpaper 4k",
        nature: "nature wallpaper 4k",
        city: "city wallpaper 4k",
        abstract: "abstract wallpaper 4k",
        all: "wallpaper 4k"
    };
    
    const query = queries[category] || queries.all;
    const url = `https://api.pexels.com/v1/search?query=${encodeURIComponent(query)}&per_page=40&orientation=landscape`;
    
    try {
        const response = await axios.get(url, {
            headers: { 'Authorization': API_KEY }
        });
        
        const photos = response.data.photos;
        if (!photos || photos.length === 0) return null;
        
        // Filter for high resolution
        const highResPhotos = photos.filter(photo => photo.width >= 1920 && photo.height >= 1080);
        const availablePhotos = highResPhotos.filter(photo => !POSTED_IMAGES.has(photo.url));
        
        if (availablePhotos.length === 0 && highResPhotos.length > 0) {
            POSTED_IMAGES.clear();
            const selected = highResPhotos[Math.floor(Math.random() * highResPhotos.length)];
            POSTED_IMAGES.add(selected.url);
            return formatPexelsResult(selected);
        }
        
        if (availablePhotos.length > 0) {
            const selected = availablePhotos[Math.floor(Math.random() * availablePhotos.length)];
            POSTED_IMAGES.add(selected.url);
            return formatPexelsResult(selected);
        }
        
        return null;
    } catch (error) {
        console.error('Pexels API error:', error.message);
        return null;
    }
}

function formatPexelsResult(photo) {
    return {
        title: photo.alt || `${photo.width}x${photo.height} Wallpaper`,
        url: photo.src.original,
        author: photo.photographer,
        author_url: photo.photographer_url,
        source: "Pexels",
        width: photo.width,
        height: photo.height
    };
}

// ============================================
// POSTING FUNCTION
// ============================================
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
    
    console.log(`🖼️ Fetching wallpaper for category: ${CATEGORY}`);
    
    // Try to get wallpaper from APIs
    let wallpaper = null;
    let source = null;
    
    // Try Pexels first if API key is available
    if (API_KEY) {
        wallpaper = await fetchWallpaperFromPexels(CATEGORY);
        if (wallpaper) source = "pexels";
    }
    
    // Fallback to Reddit if Pexels fails or no API key
    if (!wallpaper) {
        wallpaper = await fetchWallpaperFromReddit(CATEGORY);
        if (wallpaper) source = "reddit";
    }
    
    if (!wallpaper) {
        console.error("❌ Failed to fetch wallpaper from all sources");
        return;
    }
    
    // Create beautiful embed
    const categoryEmoji = CATEGORY_EMOJIS[CATEGORY] || "🖼️";
    const embed = new EmbedBuilder()
        .setTitle(`${categoryEmoji} ${wallpaper.title || "High Quality Wallpaper"}`)
        .setDescription(
            `> **Resolution:** ${wallpaper.width ? `${wallpaper.width}x${wallpaper.height}` : "HD/4K"}\n` +
            `> **Category:** ${CATEGORY.charAt(0).toUpperCase() + CATEGORY.slice(1)}\n` +
            `> **Source:** ${source === "pexels" ? "Pexels" : "Reddit"}`
        )
        .setColor(0x2b2d31)
        .setImage(wallpaper.url)
        .setFooter({ 
            text: source === "pexels" 
                ? `📸 Photographer: ${wallpaper.author} | Pexels.com` 
                : `👍 ${wallpaper.score || 0} upvotes • u/${wallpaper.author || "unknown"}`,
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();
    
    // Add source link button if available
    const components = [];
    if (source === "reddit" && wallpaper.permalink) {
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel('View on Reddit')
                    .setURL(wallpaper.permalink)
                    .setStyle(ButtonStyle.Link),
                new ButtonBuilder()
                    .setLabel('Download Original')
                    .setURL(wallpaper.url)
                    .setStyle(ButtonStyle.Link)
            );
        components.push(row);
    } else if (source === "pexels" && wallpaper.author_url) {
        const { ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setLabel(`View ${wallpaper.author}'s Profile`)
                    .setURL(wallpaper.author_url)
                    .setStyle(ButtonStyle.Link),
                new ButtonBuilder()
                    .setLabel('Download Original')
                    .setURL(wallpaper.url)
                    .setStyle(ButtonStyle.Link)
            );
        components.push(row);
    }
    
    await channel.send({ embeds: [embed], components });
    console.log(`✅ Wallpaper posted successfully!`);
}

// ============================================
// MANUAL POST COMMAND (for testing)
// ============================================
client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (!message.content.startsWith('!wall')) return;
    
    const args = message.content.split(' ');
    const command = args[0].toLowerCase();
    
    if (command === '!wall') {
        // Check if user has permission
        if (!message.member.permissions.has('Administrator')) {
            return message.reply('❌ You need administrator permissions to use this command.');
        }
        
        // Check if specific category was requested
        const requestedCategory = args[1]?.toLowerCase();
        if (requestedCategory && CATEGORIES[requestedCategory]) {
            await postWallpaperWithCustomCategory(requestedCategory, message.channel);
        } else {
            await postWallpaper();
        }
    }
});

async function postWallpaperWithCustomCategory(category, channel) {
    console.log(`🖼️ Manual post requested for category: ${category}`);
    
    let wallpaper = null;
    let source = null;
    
    if (API_KEY) {
        wallpaper = await fetchWallpaperFromPexels(category);
        if (wallpaper) source = "pexels";
    }
    
    if (!wallpaper) {
        wallpaper = await fetchWallpaperFromReddit(category);
        if (wallpaper) source = "reddit";
    }
    
    if (!wallpaper) {
        return channel.send("❌ Failed to fetch wallpaper. Please try again later.");
    }
    
    const categoryEmoji = CATEGORY_EMOJIS[category] || "🖼️";
    const embed = new EmbedBuilder()
        .setTitle(`${categoryEmoji} ${wallpaper.title || "High Quality Wallpaper"}`)
        .setDescription(
            `> **Resolution:** ${wallpaper.width ? `${wallpaper.width}x${wallpaper.height}` : "HD/4K"}\n` +
            `> **Category:** ${category.charAt(0).toUpperCase() + category.slice(1)}\n` +
            `> **Source:** ${source === "pexels" ? "Pexels" : "Reddit"}`
        )
        .setColor(0x2b2d31)
        .setImage(wallpaper.url)
        .setFooter({ 
            text: source === "pexels" 
                ? `📸 Photographer: ${wallpaper.author} | Pexels.com` 
                : `👍 ${wallpaper.score || 0} upvotes • u/${wallpaper.author || "unknown"}`,
            iconURL: client.user.displayAvatarURL()
        })
        .setTimestamp();
    
    await channel.send({ embeds: [embed] });
    console.log(`✅ Manual wallpaper posted!`);
}

// ============================================
// READY EVENT
// ============================================
client.once('ready', async () => {
    console.log(`✨ ${client.user.tag} is now online!`);
    console.log(`📁 Wallpaper bot ready to post!`);
    console.log(`⏰ Schedule: ${POST_INTERVAL}`);
    console.log(`🎨 Category: ${CATEGORY}`);
    
    // Post first wallpaper immediately
    setTimeout(async () => {
        await postWallpaper();
    }, 5000);
    
    // Schedule regular posts using cron
    cron.schedule(POST_INTERVAL, async () => {
        console.log(`⏰ Scheduled post triggered at ${new Date().toLocaleString()}`);
        await postWallpaper();
    });
    
    console.log(`✅ Wallpaper scheduler started!`);
});

// ============================================
// ERROR HANDLING
// ============================================
process.on('unhandledRejection', (error) => {
    console.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
});

// ============================================
// LOGIN
// ============================================
client.login(BOT_TOKEN);
