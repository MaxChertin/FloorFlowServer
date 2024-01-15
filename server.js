const app = require('express')();
const server = require('http').createServer(app);
const io = require('socket.io')(server);

let connectedClients = 0;

// Firebase Cloud Messaging endpoing - legacy
// WARNING: LEGACY ENDPOINT. DEPRECATED ON 20/6/2023 - WILL BE REMOVED IN 6/2024.
const FCM_ENDPOINT = 'https://fcm.googleapis.com/fcm/send';
const SERVER_KEY = 'AAAAJgRLLug:APA91bEGEJiKWXQpn0g0Bb0gra2Xk69PwGBUWL7PEe-YFkpquA7eSnty8fmbHgZyRxujG87efRAmp1iD46-kw7Chx6PZ0hcW8qzyok_rwKzj7bp4ZDr_mrBXsa6Jp6MFjb4VMtrl0H9U';

const TARGET = 'https://floor-flow-server.onrender.com';
const INTERVAL_DELAY = 14 * 60 * 1000;

const heartbeat = () => {
    fetch(TARGET)
    .finally(() => {
        console.log('server-heartbeat');
    });
}

setInterval(heartbeat, INTERVAL_DELAY);

io.on('connection', (socket) => {
    connectedClients++;
    console.log (`A user connected (${connectedClients}), id:`, socket.id);

    // Handle floor-request event from client
    socket.on('floor-request', async (data, callback) => {
        callback();
        console.log ('received floor request from client (NANE:FLOOR:TIME) ->', data);
        // io.emit is to broadcast to all clients
        // const targetSocketId = data.targetSocketId;
        // io.to(targetSocketId).emit('','');
        // if(data)

        const dataset = data.split(':');
        const name = dataset[0];
        const floorNumber = dataset[1];
        const requestTime = dataset.slice(2, 5).join(':');

        // FCM TEST TOKEN: fAuXnthMRpSU8_CKUYIo2A:APA91bH9w0_BDIwbBnooIj1zi2wm-03-ekWZO6K4Qj8teVoiIrWwQaRdu4jL_rmE5Wnxsn9-z6VmnjdAsGJg67rb15kQlEQdfp_QYAquX72q-qAiFnJrbY-_pvGlulETEE-Exfel1sZL
        const deviceToken = 'fAuXnthMRpSU8_CKUYIo2A:APA91bH9w0_BDIwbBnooIj1zi2wm-03-ekWZO6K4Qj8teVoiIrWwQaRdu4jL_rmE5Wnxsn9-z6VmnjdAsGJg67rb15kQlEQdfp_QYAquX72q-qAiFnJrbY-_pvGlulETEE-Exfel1sZL';

        // Payload for Firebase Cloud Messaging
        const payload = {
            to: '/topics/malitan',
            //to: deviceToken,
            priority: 'high', // for Android
            content_available: true, // for iOS
            time_to_live: 0,
            notification: {
                title: `קומה ${floorNumber}`,
                body: `קומה ${floorNumber} התבקשה על ידי ${name}!`,
            },
            data: {
                name: `${name}`,
                floorNum: `${floorNumber}`,
                requestTime: `${requestTime}`
            },
            contentAvailable: true,
            android: {
                android_channel_id: 'default',
                priority: 'high',
            },
            apns: {
                headers: {
                    'apns-push-type': 'background',
                    'apns-priority': '10', // Priority value (10 highest)
                    'apns-topic': 'com.maxchertin.FloorFlow',
                  },
                  payload: {
                    aps: {
                      contentAvailable: true,
                      badge: 1,
                      sound: 'default'
                    }
                  }
            },
        };

        try {
            const response = await fetch(FCM_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `key=${SERVER_KEY}`,
                },
                body: JSON.stringify(payload),
            });

            const fcmData = await response.json();
            console.log('Message sent:', fcmData);
        } catch (error) {
            console.log('Error sending message:', error);
        }
    });

    // Disconnect event
    socket.on('disconnect', () => {
        connectedClients--;
        console.log(`A user disconnected (${connectedClients})`);
    });
});

// start server
const PORT = process.env.PORT || 80;
server.listen(PORT, () => {
    console.log('server running on port', PORT);
});