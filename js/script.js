// Configuration
const CONFIG = {
    API_KEY: "AIzaSyAB5ZP3jnLtjz3IPRRrCe66yElwAJh8TsY",
    CACHE_NAME: 'orpheus-video-cache-v5',
    MAX_HISTORY_ITEMS: 50,
    CHUNK_SIZE: 5
};

// Global state
let autoplayEnabled = true;
let historyAutoplayEnabled = true;
let currentVideoId = null;
let isDragging = false;
let offsetX, offsetY, startX, startY;

const playlists = {
    "hindi-videos": "PL4uUU2x5ZgR1JOlcY9SZB94MW6fBE8ovU",
    "english-videos": "PLx0sYbCqOb8TBPRdmBHs5Iftvv9TPboYG",
    "punjabi-videos": "PLFFyMei_d85U5RQdXjRQ5F012qr4vSmSa"
};

// DOM Elements
const elements = {
    searchQuery: document.getElementById("search-query"),
    searchButton: document.getElementById("search-button"),
    searchResults: document.getElementById("search-results"),
    searchLoading: document.getElementById("search-loading"),
    historyVideos: document.getElementById("history-videos"),
    historyLoading: document.getElementById("history-loading"),
    clearHistory: document.getElementById("clear-history"),
    floatingPlayer: document.getElementById("floating-player"),
    floatingVideo: document.getElementById("floating-video"),
    playerTitle: document.getElementById("player-title"),
    closePlayer: document.getElementById("close-player"),
    autoplayToggle: document.getElementById("autoplay-toggle"),
    historyAutoplayToggle: document.getElementById("history-autoplay-toggle")
};

// Initialize the application
function initApp() {
    // Load preferences
    loadPreferences();
    
    // Request notification permissions
    requestNotificationPermission();
    
    // Set up event listeners
    setupEventListeners();
    
    // Initialize cache and load data
    initializeCache()
        .then(() => {
            displayPlaybackHistory();
            Object.keys(playlists).forEach(containerId => {
                fetchPlaylistVideos(playlists[containerId], containerId);
            });
        })
        .catch(err => {
            console.error('Cache initialization error:', err);
            displayPlaybackHistory();
            Object.keys(playlists).forEach(containerId => {
                fetchPlaylistVideos(playlists[containerId], containerId);
            });
        });
}

// Load user preferences from localStorage
function loadPreferences() {
    if (localStorage.getItem('autoplayEnabled') !== null) {
        autoplayEnabled = localStorage.getItem('autoplayEnabled') === 'true';
        elements.autoplayToggle.textContent = `Autoplay: ${autoplayEnabled ? 'ON' : 'OFF'}`;
    }
    
    if (localStorage.getItem('historyAutoplayEnabled') !== null) {
        historyAutoplayEnabled = localStorage.getItem('historyAutoplayEnabled') === 'true';
        elements.historyAutoplayToggle.textContent = `History Autoplay: ${historyAutoplayEnabled ? 'ON' : 'OFF'}`;
    }
}

// Request notification permission
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }
}

// Set up event listeners
function setupEventListeners() {
    // Search functionality
    elements.searchButton.addEventListener("click", searchYouTube);
    elements.searchQuery.addEventListener("keyup", function(event) {
        if (event.key === "Enter") {
            searchYouTube();
        }
    });
    
    // Player controls
    elements.closePlayer.addEventListener("click", closeFloatingPlayer);
    elements.autoplayToggle.addEventListener("click", toggleAutoplay);
    elements.historyAutoplayToggle.addEventListener("click", toggleHistoryAutoplay);
    elements.clearHistory.addEventListener("click", clearPlaybackHistory);
    
    // Initialize draggable player
    initDraggablePlayer();
}

// Initialize Cache API
async function initializeCache() {
    try {
        const cache = await caches.open(CONFIG.CACHE_NAME);
        console.log('Cache initialized');
        return cache;
    } catch (error) {
        console.error('Cache initialization failed:', error);
        throw error;
    }
}

// Search YouTube
function searchYouTube() {
    const query = elements.searchQuery.value.trim();
    if (!query) {
        alert("Please enter a search term");
        return;
    }

    const API_URL = `https://www.googleapis.com/youtube/v3/search?part=snippet&q=${encodeURIComponent(query + " music")}&type=video&maxResults=10&key=${CONFIG.API_KEY}`;
    
    const videoList = elements.searchResults.querySelector(".video-list");
    
    elements.searchResults.style.display = "block";
    videoList.innerHTML = "";
    elements.searchLoading.style.display = "flex";
    
    fetch(API_URL)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            videoList.innerHTML = "";
            
            if (data.items && data.items.length > 0) {
                data.items.forEach(video => {
                    const videoId = video.id.videoId;
                    const thumbnailUrl = getBestThumbnail(video.snippet.thumbnails);
                    
                    const videoElement = createVideoElement(
                        videoId, 
                        video.snippet.title,
                        thumbnailUrl,
                        new Date(video.snippet.publishedAt).toLocaleDateString()
                    );
                    
                    videoList.appendChild(videoElement);
                });
            } else {
                videoList.innerHTML = '<p>No results found. Try a different search term.</p>';
            }
            
            elements.searchLoading.style.display = "none";
        })
        .catch(error => {
            console.error("Error fetching search results:", error);
            videoList.innerHTML = '<p>Failed to load search results. Please try again later.</p>';
            elements.searchLoading.style.display = "none";
        });
}

// Fetch playlist videos
function fetchPlaylistVideos(playlistId, containerId) {
    const API_URL = `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=10&key=${CONFIG.API_KEY}`;
    
    fetch(API_URL)
        .then(response => {
            if (!response.ok) throw new Error('Network response was not ok');
            return response.json();
        })
        .then(data => {
            const videoList = document.querySelector(`#${containerId} .video-list`);
            const loadingElement = document.getElementById(`${containerId}-loading`);
            
            videoList.innerHTML = "";
            
            if (data.items && data.items.length > 0) {
                data.items.forEach(video => {
                    const videoId = video.snippet.resourceId.videoId;
                    const thumbnailUrl = getBestThumbnail(video.snippet.thumbnails);
                    
                    const videoElement = createVideoElement(
                        videoId, 
                        video.snippet.title,
                        thumbnailUrl,
                        new Date(video.snippet.publishedAt).toLocaleDateString()
                    );
                    
                    videoList.appendChild(videoElement);
                });
            } else {
                videoList.innerHTML = '<p>No videos found in this playlist.</p>';
            }
            
            if (loadingElement) loadingElement.style.display = "none";
        })
        .catch(error => {
            console.error(`Error fetching ${containerId} videos:`, error);
            const videoList = document.querySelector(`#${containerId} .video-list`);
            const loadingElement = document.getElementById(`${containerId}-loading`);
            
            videoList.innerHTML = '<p>Failed to load videos. Please try again later.</p>';
            if (loadingElement) loadingElement.style.display = "none";
        });
}

// Get best thumbnail
function getBestThumbnail(thumbnails) {
    return thumbnails?.medium?.url || 
           thumbnails?.high?.url ||
           thumbnails?.default?.url ||
           'https://i.ytimg.com/vi/default.jpg';
}

// Create video element
function createVideoElement(videoId, title, thumbnailUrl, date = '', artist = '', composer = '') {
    const videoElement = document.createElement("div");
    videoElement.classList.add("video");
    
    const dateElement = date ? `<p class="timestamp">${date}</p>` : '';
    const artistElement = artist ? `<p class="artist">${artist}</p>` : '';
    
    videoElement.innerHTML = `
        <h3 title="${title}">${title}</h3>
        ${artistElement}
        ${dateElement}
        <img src="${thumbnailUrl}" class="video-thumbnail" alt="${title}" loading="lazy">
    `;
    
    videoElement.onclick = async () => {
        // First try to get cached data
        let videoData = await getCachedVideoData(videoId);
        
        if (!videoData) {
            // If not cached, create basic data and fetch details
            videoData = {
                id: videoId,
                title: title,
                thumbnail: thumbnailUrl,
                link: `https://www.youtube.com/watch?v=${videoId}`,
                timestamp: new Date().toISOString(),
                artist: 'Unknown Artist',
                composer: 'Unknown Composer'
            };
            
            // Fetch and cache enhanced data
            await cacheVideoData(videoId, videoData);
            videoData = await getCachedVideoData(videoId) || videoData;
        }
        
        openFloatingPlayer(videoData);
    };
    
    return videoElement;
}

// Cache video data
async function cacheVideoData(videoId, videoData) {
    try {
        const enhancedData = {
            ...videoData,
            lastUpdated: new Date().toISOString()
        };
        
        const cache = await caches.open(CONFIG.CACHE_NAME);
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const response = new Response(JSON.stringify(enhancedData), {
            headers: { 'Content-Type': 'application/json' }
        });
        await cache.put(url, response);
    } catch (error) {
        console.error('Failed to cache video data:', error);
    }
}

// Get cached video data
async function getCachedVideoData(videoId) {
    try {
        const cache = await caches.open(CONFIG.CACHE_NAME);
        const url = `https://www.youtube.com/watch?v=${videoId}`;
        const response = await cache.match(url);
        
        if (response) {
            const data = await response.json();
            return data;
        }
        return null;
    } catch (error) {
        console.error('Failed to retrieve cached data:', error);
        return null;
    }
}

// Open floating player
async function openFloatingPlayer(videoData) {
    currentVideoId = videoData.id;
    
    try {
        // Save to cache and history
        await cacheVideoData(videoData.id, videoData);
        saveToPlaybackHistory(videoData);
        
        // Show player
        elements.floatingVideo.src = `https://www.youtube.com/embed/${videoData.id}?autoplay=1&enablejsapi=1`;
        elements.playerTitle.textContent = videoData.title;
        elements.floatingPlayer.style.display = "block";
        
        // Setup YouTube API listener
        elements.floatingVideo.onload = function() {
            this.contentWindow.postMessage('{"event":"command","func":"addEventListener","args":["onStateChange","onPlayerStateChange"]}', '*');
        };
        
        // Analytics event
        if (window.va) {
            window.va('track', 'PlayVideo', { 
                videoId: videoData.id, 
                title: videoData.title,
                artist: videoData.artist,
                composer: videoData.composer
            });
        }
    } catch (error) {
        console.error('Error opening player:', error);
        alert('Failed to play video. Please try again.');
    }
}

// YouTube player state change handler
window.onPlayerStateChange = async function(event) {
    // When video ends (state = 0)
    if (event.data === 0 && autoplayEnabled && currentVideoId) {
        // If history autoplay is enabled, play next from history
        if (historyAutoplayEnabled) {
            const nextVideo = getNextHistoryVideo(currentVideoId);
            if (nextVideo) {
                openFloatingPlayer(nextVideo);
                showNotification(`Now playing from history: ${nextVideo.title}`);
            }
        }
    }
};

// Show notification
function showNotification(message) {
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Orpheus Music Player', { body: message });
    } else if ('Notification' in window && Notification.permission !== 'denied') {
        Notification.requestPermission().then(permission => {
            if (permission === 'granted') {
                new Notification('Orpheus Music Player', { body: message });
            }
        });
    }
}

// Close floating player
function closeFloatingPlayer() {
    if (historyAutoplayEnabled) {
        const nextVideo = getNextHistoryVideo(currentVideoId);
        if (nextVideo) {
            openFloatingPlayer(nextVideo);
            return; // Don't close if we're playing next video
        }
    }
    
    elements.floatingPlayer.style.display = "none";
    elements.floatingVideo.src = "";
    elements.playerTitle.textContent = "No video playing";
    currentVideoId = null;
}

// Toggle autoplay function
function toggleAutoplay() {
    autoplayEnabled = !autoplayEnabled;
    elements.autoplayToggle.textContent = `Autoplay: ${autoplayEnabled ? 'ON' : 'OFF'}`;
    
    // Save preference to localStorage
    localStorage.setItem('autoplayEnabled', autoplayEnabled);
}

// Toggle history autoplay function
function toggleHistoryAutoplay() {
    historyAutoplayEnabled = !historyAutoplayEnabled;
    elements.historyAutoplayToggle.textContent = `History Autoplay: ${historyAutoplayEnabled ? 'ON' : 'OFF'}`;
    
    // Save preference to localStorage
    localStorage.setItem('historyAutoplayEnabled', historyAutoplayEnabled);
}

// Get next video from history
function getNextHistoryVideo(currentVideoId) {
    const history = getPlaybackHistory();
    if (history.length === 0) return null;
    
    // If no current video, return the first in history
    if (!currentVideoId) return history[0];
    
    // Find current video index
    const currentIndex = history.findIndex(v => v.id === currentVideoId);
    
    // If not found or last in array, return first video
    if (currentIndex === -1 || currentIndex === history.length - 1) {
        return history[0];
    }
    
    // Otherwise return next video
    return history[currentIndex + 1];
}

// Save to playback history
function saveToPlaybackHistory(videoData) {
    const history = getPlaybackHistory();
    
    // Remove if already exists (to avoid duplicates)
    const existingIndex = history.findIndex(v => v.id === videoData.id);
    if (existingIndex >= 0) {
        history.splice(existingIndex, 1);
    }
    
    // Add new video to beginning of array
    history.unshift(videoData);
    
    // Keep only the last items
    const limitedHistory = history.slice(0, CONFIG.MAX_HISTORY_ITEMS);
    
    localStorage.setItem('playbackHistory', JSON.stringify(limitedHistory));
    
    // Update the displayed history
    displayPlaybackHistory();
}

// Get playback history
function getPlaybackHistory() {
    const history = localStorage.getItem('playbackHistory');
    return history ? JSON.parse(history) : [];
}

// Clear playback history
function clearPlaybackHistory() {
    if (confirm("Are you sure you want to clear your playback history?")) {
        localStorage.removeItem('playbackHistory');
        document.querySelector("#history-videos .video-list").innerHTML = 
            '<p>Your playback history is empty.</p>';
            
        if (window.va) {
            window.va('track', 'ClearHistory');
        }
    }
}

// Display playback history
async function displayPlaybackHistory() {
    const history = getPlaybackHistory();
    const videoList = document.querySelector("#history-videos .video-list");
    
    elements.historyLoading.style.display = "flex";
    videoList.innerHTML = "";
    
    if (history.length === 0) {
        videoList.innerHTML = '<p>Your playback history is empty.</p>';
        elements.historyLoading.style.display = "none";
        return;
    }
    
    // Process history in chunks
    for (let i = 0; i < history.length; i += CONFIG.CHUNK_SIZE) {
        const chunk = history.slice(i, i + CONFIG.CHUNK_SIZE);
        
        await Promise.all(chunk.map(async (video) => {
            let videoData = video;
            const cachedData = await getCachedVideoData(video.id);
            if (cachedData) {
                videoData = { ...video, ...cachedData };
            }
            
            const videoElement = createVideoElement(
                videoData.id,
                videoData.title,
                videoData.thumbnail,
                new Date(videoData.timestamp).toLocaleString(),
                videoData.artist,
                videoData.composer
            );
            
            videoList.appendChild(videoElement);
        }));
        
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    elements.historyLoading.style.display = "none";
}

// Initialize draggable player
function initDraggablePlayer() {
    elements.floatingPlayer.addEventListener("mousedown", (e) => {
        if (e.target === elements.floatingPlayer || e.target.id === "player-controls" || e.target.id === "player-title") {
            isDragging = true;
            elements.floatingPlayer.classList.add("active");
            offsetX = e.clientX - elements.floatingPlayer.getBoundingClientRect().left;
            offsetY = e.clientY - elements.floatingPlayer.getBoundingClientRect().top;
            startX = e.clientX;
            startY = e.clientY;
            e.preventDefault();
        }
    });

    document.addEventListener("mousemove", (e) => {
        if (!isDragging) return;
        
        const x = e.clientX - offsetX;
        const y = e.clientY - offsetY;
        
        const maxX = window.innerWidth - elements.floatingPlayer.offsetWidth;
        const maxY = window.innerHeight - elements.floatingPlayer.offsetHeight;
        
        elements.floatingPlayer.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
        elements.floatingPlayer.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
    });

    document.addEventListener("mouseup", (e) => {
        if (!isDragging) return;
        
        const dist = Math.sqrt(Math.pow(e.clientX - startX, 2) + Math.pow(e.clientY - startY, 2));
        if (dist < 5) {
            // Click behavior could be added here
        }
        
        isDragging = false;
        elements.floatingPlayer.classList.remove("active");
    });

    // Touch support
    elements.floatingPlayer.addEventListener("touchstart", (e) => {
        if (e.target === elements.floatingPlayer || e.target.id === "player-controls" || e.target.id === "player-title") {
            isDragging = true;
            elements.floatingPlayer.classList.add("active");
            const touch = e.touches[0];
            offsetX = touch.clientX - elements.floatingPlayer.getBoundingClientRect().left;
            offsetY = touch.clientY - elements.floatingPlayer.getBoundingClientRect().top;
            startX = touch.clientX;
            startY = touch.clientY;
            e.preventDefault();
        }
    });

    document.addEventListener("touchmove", (e) => {
        if (!isDragging || !e.touches.length) return;
        
        const touch = e.touches[0];
        const x = touch.clientX - offsetX;
        const y = touch.clientY - offsetY;
        
        const maxX = window.innerWidth - elements.floatingPlayer.offsetWidth;
        const maxY = window.innerHeight - elements.floatingPlayer.offsetHeight;
        
        elements.floatingPlayer.style.left = `${Math.max(0, Math.min(x, maxX))}px`;
        elements.floatingPlayer.style.top = `${Math.max(0, Math.min(y, maxY))}px`;
        
        e.preventDefault();
    });

    document.addEventListener("touchend", () => {
        isDragging = false;
        elements.floatingPlayer.classList.remove("active");
    });
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', initApp);

// Service Worker Registration
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('service-worker.js').then(() => {
        console.log('Service Worker Registered');
    }).catch(err => {
        console.error('Service Worker registration failed:', err);
    });
}
