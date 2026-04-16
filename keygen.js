const crypto = require('crypto');

// THIS IS YOUR SECRET. DO NOT SHARE THIS FILE.
const SECRET_SALT = 'VIDEOWAVES_TIMER_SECRET_KEY_2026';

function generateKey(machineId) {
    if(!machineId) {
        console.log("Usage: node keygen.js <Machine_ID>");
        return;
    }
    
    // Hash the ID with the secret formula
    const validKey = crypto.createHash('sha256').update(machineId.trim() + SECRET_SALT).digest('hex').substring(0, 16).toUpperCase();
    
    // Format clearly
    const formattedKey = `${validKey.slice(0,4)}-${validKey.slice(4,8)}-${validKey.slice(8,12)}-${validKey.slice(12,16)}`;
    
    console.log("==========================================");
    console.log("Client Machine ID : " + machineId);
    console.log("Valid LICENSE KEY : " + formattedKey);
    console.log("==========================================");
}

// Get from command line argument
const inputId = process.argv[2];
generateKey(inputId);
