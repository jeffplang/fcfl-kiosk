const WebSocketServer = require('ws');
const rpio = require('rpio');

const wss = new WebSocketServer.Server({ port: 8080 })

rpio.open(15, rpio.INPUT, rpio.PULL_UP);

wss.on("connection", ws => {
    function pollcb(pin)
    {
        /*
         * Wait for a small period of time to avoid rapid changes which
         * can't all be caught with the 1ms polling frequency.  If the
         * pin is no longer down after the wait then ignore it.
         */
        rpio.msleep(20);

        if (rpio.read(pin))
                return;
        ws.send("foobar!");
        console.log('Button pressed on pin P%d', pin);
    }

  
    rpio.poll(15, pollcb, rpio.POLL_LOW);

    ws.on("message", data => {
        console.log(`Client has sent us: ${data}`)
    });

    ws.on("close", () => {
        console.log("the client has connected");
    });

    ws.onerror = function () {
        console.log("Some Error occurred")
    }
});

console.log("The WebSocket server is running on port 8080");

