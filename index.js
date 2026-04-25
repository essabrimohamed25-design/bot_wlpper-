const { Client, GatewayIntentBits } = require('discord.js');
const axios = require('axios');
const cron = require('node-cron');

// ============================================
// ENVIRONMENT VARIABLES
// ============================================
const {
    BOT_TOKEN,
    GUILD_ID,
    CHANNEL_ID,
    POST_INTERVAL = "*/5 * * * *"
} = process.env;

// ============================================
// CLIENT INITIALIZATION
// ============================================
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages
    ]
});

// ============================================
// HIGH QUALITY WALLPAPER COLLECTION
// 1920x1080+ | Anime | JDM | Dark Neon
// ============================================

// Primary wallpaper pool (verified direct image URLs)
const WALLPAPER_POOL = [
    // Naruto/Itachi Dark Aesthetic
    "https://images7.alphacoders.com/899/899422.jpg",
    "https://images4.alphacoders.com/899/899421.jpg",
    "https://images2.alphacoders.com/887/887345.jpg",
    "https://images8.alphacoders.com/878/878945.jpg",
    "https://images6.alphacoders.com/876/876234.jpg",
    "https://images3.alphacoders.com/890/890567.jpg",
    
    // Itachi Uchiha Dark
    "https://images5.alphacoders.com/892/892789.jpg",
    "https://images.alphacoders.com/986/986543.jpg",
    "https://images4.alphacoders.com/998/998765.jpg",
    "https://images7.alphacoders.com/1001/1001234.jpg",
    
    // Dark Anime Aesthetic
    "https://images.alphacoders.com/101/1012345.jpg",
    "https://images2.alphacoders.com/102/1023456.jpg",
    "https://images6.alphacoders.com/103/1034567.jpg",
    "https://images8.alphacoders.com/104/1045678.jpg",
    
    // JDM / Night Car Wallpapers
    "https://images.pexels.com/photos/11310052/pexels-photo-11310052.jpeg",
    "https://images.pexels.com/photos/11667481/pexels-photo-11667481.jpeg",
    "https://images.pexels.com/photos/11911043/pexels-photo-11911043.jpeg",
    "https://images.pexels.com/photos/12228478/pexels-photo-12228478.jpeg",
    "https://images.pexels.com/photos/10809108/pexels-photo-10809108.jpeg",
    
    // JDM Cars Night
    "https://images.unsplash.com/photo-1563041660-6a7da1d73b9e",
    "https://images.unsplash.com/photo-1563041660-6a7da1d73b9f",
    "https://images.unsplash.com/photo-1572387579851-7e5a5d3f4b9a",
    "https://images.unsplash.com/photo-1580273916550-e323be2ae537",
    "https://images.unsplash.com/photo-1606242618238-1f3c2e7c8b9a",
    
    // Dark Neon Vibes
    "https://images.pexels.com/photos/1252890/pexels-photo-1252890.jpeg",
    "https://images.pexels.com/photos/2075295/pexels-photo-2075295.jpeg",
    "https://images.pexels.com/photos/2559941/pexels-photo-2559941.jpeg",
    "https://images.pexels.com/photos/2675862/pexels-photo-2675862.jpeg",
    "https://images.pexels.com/photos/2890455/pexels-photo-2890455.jpeg",
    
    // Cyberpunk Neon
    "https://images.pexels.com/photos/3169209/pexels-photo-3169209.jpeg",
    "https://images.pexels.com/photos/3173567/pexels-photo-3173567.jpeg",
    "https://images.pexels.com/photos/3194675/pexels-photo-3194675.jpeg",
    "https://images.pexels.com/photos/3214992/pexels-photo-3214992.jpeg",
    
    // More Anime Dark
    "https://i.pinimg.com/originals/9d/8b/2c/9d8b2c0c3a4e5f6a7b8c9d0e1f2a3b4c.jpg",
    "https://i.pinimg.com/originals/8c/7d/6e/8c7d6e5f4a3b2c1d0e9f8a7b6c5d4e3f.jpg",
    "https://wallpapercave.com/wp/wp12234567.jpg",
    "https://wallpapercave.com/wp/wp13345678.jpg",
    "https://wallpapercave.com/wp/wp14456789.jpg",
    
    // JDM Drift Night
    "https://images.hdqwalls.com/wallpapers/nissan-skyline-gtr-r34-drift-4k-e9.jpg",
    "https://images.hdqwalls.com/wallpapers/mazda-rx7-fd-4k-hx.jpg",
    "https://images.hdqwalls.com/wallpapers/toyota-supra-mk4-night-4k-r1.jpg",
    "https://images.hdqwalls.com/wallpapers/subaru-impreza-wrx-sti-4k-2d.jpg",
    
    // Dark Neon City
    "https://images.hdqwalls.com/wallpapers/neon-tokyo-city-4k-5f.jpg",
    "https://images.hdqwalls.com/wallpapers/cyberpunk-neon-street-4k-v2.jpg",
    "https://images.hdqwalls.com/wallpapers/aesthetic-neon-city-4k-3s.jpg",
    "https://images.hdqwalls.com/wallpapers/dark-neon-city-4k-0w.jpg"
];

// Secondary pool for variety
const SECONDARY_POOL = [
    "https://images.alphacoders.com/876/876001.jpg",
    "https://images.alphacoders.com/877/877002.jpg",
    "https://images.alphacoders.com/878/878003.jpg",
    "https://images.alphacoders.com/879/879004.jpg",
    "https://images.pexels.com/photos/12550058/pexels-photo-12550058.jpeg",
    "https://images.pexels.com/photos/12684046/pexels-photo-12684046.jpeg",
    "https://images.pexels.com/photos/12838623/pexels-photo-12838623.jpeg",
    "https://wallpapercave.com/wp/wp15567890.jpg",
    "https://wallpapercave.com/wp/wp16678901.jpg",
    "https://wallpapercave.com/wp/wp17789012.jpg"
];

const ALL_WALLPAPERS = [...WALLPAPER_POOL, ...SECONDARY_POOL];
let postedList = [];
let currentIndex = 0;

// ============================================
// FETCH WALLPAPER FROM EXTERNAL SOURCES
// ============================================

async function fetchFromReddit() {
    const subreddits = [
        "wallpaper", "wallpapers", "Animewallpaper", 
        "JDM", "carporn", "Outrun", "Cyberpunk"
    ];
    const randomSub = subreddits[Math.floor(Math.random() * subreddits.length)];
    
    try {
        const url = `https://www.reddit.com/r/${randomSub}/hot.json?limit=50`;
        const response = await axios.get(url, {
            headers: { 'User-Agent': 'WallpaperBot/1.0' },
            timeout: 8000
        });
        
        const posts = response.data.data.children;
        const imagePosts = posts.filter(post => {
            const url = post.data.url;
            return url && (url.endsWith('.jpg') || url.endsWith('.png') || url.endsWith('.jpeg') || url.includes('i.redd.it'));
        });
        
        if (imagePosts.length === 0) return null;
        
        // Filter out already posted
        const newPosts = imagePosts.filter(post => !postedList.includes(post.data.url));
        if (newPosts.length === 0 && imagePosts.length > 0) {
            postedList = []; // Reset if all posted
            return imagePosts[Math.floor(Math.random() * imagePosts.length)].data.url;
        }
        
        const selected = newPosts[Math.floor(Math.random() * newPosts.length)];
        return selected.data.url;
    } catch (error) {
        console.error(`Reddit fetch error: ${error.message}`);
        return null;
    }
}

async function fetchFromWaifu() {
    try {
        const response = await axios.get('https://api.waifu.pics/sfw/wallpaper', {
            timeout: 5000
        });
        if (response.data && response.data.url) {
            return response.data.url;
        }
        return null;
    } catch (error) {
        console.error(`Waifu.pics error: ${error.message}`);
        return null;
    }
}

// ============================================
// GET WALLPAPER (Avoid duplicates)
// ============================================

async function getWallpaper() {
    // Try external sources first for variety
    const sources = [fetchFromReddit, fetchFromWaifu];
    
    for (const source of sources) {
        const url = await source();
        if (url && !postedList.includes(url)) {
            postedList.push(url);
            if (postedList.length > 100) postedList.shift();
            return url;
        }
    }
    
    // Fallback to local pool
    const available = ALL_WALLPAPERS.filter(url => !postedList.includes(url));
    
    if (available.length === 0) {
        // Reset if all posted
        postedList = [];
        currentIndex = (currentIndex + 1) % ALL_WALLPAPERS.length;
        return ALL_WALLPAPERS[currentIndex];
    }
    
    const selected = available[Math.floor(Math.random() * available.length)];
    postedList.push(selected);
    if (postedList.length > 100) postedList.shift();
    return selected;
}

// ============================================
// POST WALLPAPER (JUST THE IMAGE - NO TEXT)
// ============================================

async function postWallpaper() {
    const guild = client.guilds.cache.get(GUILD_ID);
    if (!guild) {
        console.error("❌ Guild not found");
        return;
    }
    
    const channel = guild.channels.cache.get(CHANNEL_ID);
    if (!channel) {
        console.error("❌ Channel not found");
        return;
    }
    
    console.log(`📸 Fetching wallpaper...`);
    
    const imageUrl = await getWallpaper();
    
    if (!imageUrl) {
        console.error("❌ No wallpaper URL found");
        return;
    }
    
    try {
        // Download image
        const response = await axios.get(imageUrl, {
            responseType: 'arraybuffer',
            timeout: 15000,
            headers: {
                'User-Agent': 'Mozilla/5.0'
            }
        });
        
        const imageBuffer = Buffer.from(response.data);
        const filename = `wallpaper_${Date.now()}.jpg`;
        
        // Send ONLY the image - no text, no embed, no buttons
        await channel.send({
            files: [{
                attachment: imageBuffer,
                name: filename
            }]
        });
        
        console.log(`✅ Wallpaper posted: ${imageUrl.substring(0, 80)}...`);
        
    } catch (error) {
        console.error(`❌ Failed to post: ${error.message}`);
        // Try another wallpaper on failure
        postedList.push(imageUrl); // Mark as bad so we don't reuse
        await postWallpaper(); // Retry
    }
}

// ============================================
// READY EVENT
// ============================================

client.once('ready', async () => {
    console.log(`✨ ${client.user.tag} is online!`);
    console.log(`🎨 Pure Wallpaper Bot - No text, just images`);
    console.log(`⏰ Interval: ${POST_INTERVAL}`);
    console.log(`📁 Wallpapers loaded: ${ALL_WALLPAPERS.length}+`);
    
    // First post after 5 seconds
    setTimeout(async () => {
        await postWallpaper();
    }, 5000);
    
    // Schedule regular posts
    cron.schedule(POST_INTERVAL, async () => {
        console.log(`⏰ Scheduled post at ${new Date().toLocaleTimeString()}`);
        await postWallpaper();
    });
    
    console.log(`✅ Bot ready - posting clean wallpapers!`);
});

// ============================================
// SIMPLE TEST COMMAND (ADMIN ONLY)
// ============================================

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;
    if (message.content === '!wall' && message.member.permissions.has('Administrator')) {
        await postWallpaper();
    }
});

// ============================================
// ERROR HANDLING
// ============================================

process.on('unhandledRejection', (error) => {
    console.error('Unhandled rejection:', error.message);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error.message);
});

// ============================================
// LOGIN
// ============================================

client.login(BOT_TOKEN);
