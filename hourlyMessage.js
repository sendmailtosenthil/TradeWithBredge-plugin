const messages = {
    1: 'Got value? Share value! Donate a little, and keep the good vibes going. 🌟💵',
    2: 'This plugin isn’t powered by magic—it’s powered by meals! Buy me a meal if it made your life easier. ☕✨',
    3: 'Enjoying this plugin? Show it some love! Donations keep the bugs away and the developer happy. 🐞➡️😊',
    4: 'If this plugin made your day, toss a coin to your developer! 🎶💰',
    5: 'Feeling grateful? A small donation = big smiles for the dev. 😊👍',
    6: 'This plugin is free, but your kindness isn’t! Chip in if it helped you out. 💖🙏',
    7: 'If this plugin saved you time, a small contribution keeps me coding through the night. 🌙💻',
    8: 'No ads, no fees, just a dev. Like this plugin? Show some love with a donation! ❤️📥',
    9: 'Made your work easier? A small contribution keeps this plugin alive and thriving! 🚀💡',
    10: 'If this plugin saved your day, how about buying me a pizza? Scan below to spread some love! 🍕☕💖'
}

document.addEventListener('calender-loaded', (event) => {
    setTimeout(() => {
        showOverlay();
    }, 1000 * 60 * 60 * 1 + 1000 * 60 * 30); //60 * 60 * 2
    //showOverlay();
    document.getElementById('close-ad').addEventListener('click', closeOverlay);
});

function showOverlay() {
    const messageNumber = Math.floor(Math.random() * 10) + 1;
    const randomMessage = messages[messageNumber];
    document.getElementById('ad').textContent = randomMessage;
    document.getElementById('hourlyOverlay').style.display = 'flex';
    
}

function closeOverlay() {
    document.getElementById('hourlyOverlay').style.display = 'none';
    setTimeout(() => {
        showOverlay();
    }, 1000 * 60 * 60 * 1 + 1000 * 60 * 30);
}

// Show overlay every hour
//setInterval(showOverlay, 1000 * 10); // 3600000 ms = 1 hour
  