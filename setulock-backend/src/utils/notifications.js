const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client
let expo = new Expo();

/**
 * Sends a push notification to an Expo Push Token
 * @param {string} pushToken 
 * @param {string} message 
 * @param {object} data 
 */
const sendPushNotification = async (pushToken, message, data = {}) => {
    if (!Expo.isExpoPushToken(pushToken)) {
        console.error(`Push token ${pushToken} is not a valid Expo push token`);
        return;
    }

    const messages = [{
        to: pushToken,
        sound: 'default',
        body: message,
        data: data,
    }];

    try {
        let ticketChunk = await expo.sendPushNotificationsAsync(messages);
        console.log('Push notification sent:', ticketChunk);
        return ticketChunk;
    } catch (error) {
        console.error('Error sending push notification:', error);
    }
};

module.exports = {
    sendPushNotification
};
