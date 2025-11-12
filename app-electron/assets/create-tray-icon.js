// Simple script to create a basic tray icon
const fs = require('fs');
const { createCanvas } = require('canvas');

// Create a simple 16x16 tray icon
const canvas = createCanvas(16, 16);
const ctx = canvas.getContext('2d');

// Draw a simple "T" icon
ctx.fillStyle = '#667eea';
ctx.fillRect(0, 0, 16, 16);

ctx.fillStyle = 'white';
ctx.font = 'bold 12px Arial';
ctx.textAlign = 'center';
ctx.fillText('T', 8, 12);

// Save as PNG
const buffer = canvas.toBuffer('image/png');
fs.writeFileSync(__dirname + '/tray-icon.png', buffer);
console.log('Tray icon created successfully!');