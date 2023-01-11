const WebSocketServer = require('ws');
const rpio = require('rpio');
const express = require('express');
const { readFileSync } = require('fs');
const axios = require('axios');
const app = express();

const template = readFileSync('./index.html').toString();

app.use(express.static('assets'));
app.get('/', async (req, res) => {
  const today = new Date();
  const month = today.getMonth();
  const year = today.getFullYear();

  const monthBegin = new Date(year, month);
  const monthEnd = new Date(year, month + 1, 0);
  const firstWDay = monthBegin.getDay();
  const lastWDay = monthEnd.getDay();

  const calBegin = new Date(year, month, 1 - firstWDay);
  const calEnd = new Date(year, month + 1, 6 - lastWDay);

  let currDate = new Date(calBegin);

  const startDate = calBegin.toISOString().substr(0, 10);
  const endDate = calEnd.toISOString().substr(0, 10);

  const tzOffsetStart = `0${calBegin.getTimezoneOffset() / 60}:00`;
  const tzOffsetEnd = `0${calEnd.getTimezoneOffset() / 60}:00`;

  const url = `https://www.googleapis.com/calendar/v3/calendars/7sng0uhmbhps29hbpfturq8ncsvmhlco%40import.calendar.google.com/events?key=${process.env.GAPI_KEY}&timeMin=${startDate}T10:00:00-${tzOffsetStart}&timeMax=${endDate}T23:59:59-${tzOffsetEnd}&singleEvents=true&orderBy=startTime`;

  const resp = await axios.get(url);

  const events = resp.data.items;

  eventsIndex = {};

  resp.data.items.forEach(item => {
    const date = item.start.dateTime.substr(5, 5);
    eventsIndex[date] = eventsIndex[date] || [];
    eventsIndex[date].push(item);
  });

  let dates = '';

  while(currDate <= calEnd) {
    const lookupIdx = `${String(currDate.getMonth() + 1).padStart(2, '0')}-${String(currDate.getDate()).padStart(2, '0')}`
    dates += `<li class="${currDate.getMonth() != month ? 'month-prev-next' : ''}">`;
    dates += `<abbr>${currDate.getDate()}</abbr>`;
    if(eventsIndex[lookupIdx]) {
      dates += '<ul class=events>';
      for(event of eventsIndex[lookupIdx]) {
        const start = new Date(event.start.dateTime);
        dates += `<li>${start.toLocaleTimeString('en-US', { timeStyle: 'short' })} ${event.summary}</li>`;
      }
      dates += '</ul>';
    }
    dates += `</li>`;
    currDate.setDate(currDate.getDate() + 1);
  }

  res.send(template.replace('{{dates}}', dates));
});

app.listen(3000, () => {
    console.log('app listening on port 3000');
})

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

