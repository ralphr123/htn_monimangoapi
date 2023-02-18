const express = require('express');
const ToneAnalyzerV3 = require('ibm-watson/tone-analyzer/v3');
const { IamAuthenticator } = require('ibm-watson/auth');
const Snoowrap = require('snoowrap');
const Nexmo = require('nexmo');
const schedule = require('node-schedule');
const bodyParser = require('body-parser');

require('dotenv').config()

const PORT = process.env.PORT || 4000;
const app = express();
const stockData = require('./stocks.json');

var jsonParser = bodyParser.json()

// MODULES
const toneAnalyzer = new ToneAnalyzerV3({
  version: '2017-09-21',
  authenticator: new IamAuthenticator({
    apikey: process.env.IBMKEY,
  }),
  serviceUrl: 'https://api.us-south.tone-analyzer.watson.cloud.ibm.com/instances/265b8730-09a9-4f67-8328-a19ce9e9d4ab',
  disableSslVerification: true,
});

const reddit = new Snoowrap({
  userAgent: 'moniMango',
  clientId: process.env.REDID,
  clientSecret: process.env.REDSECRET,
  refreshToken: process.env.REDTOKEN
});

const nexmo = new Nexmo({
  apiKey: process.env.NEXMOKEY,
  apiSecret: process.env.NEXMOSECRET
});

// END MODULES

// GLOBALS
// const newsletterNumbers = ['15877183475'];
const sampleText = require("./sampletext.js");
const { json } = require('body-parser');


// function sendGroupText(numbers, ind) {
//   if (ind < numbers.length) {
//     nexmo.message.sendSms('12044106434', numbers[ind], "Hello from Vonage.", (err, responseData) => {
//       if (err) {
//           console.log(err);
//       } else {
//           if(responseData.messages[0]['status'] === "0") {
//               console.log("Message sent successfully.");
//               sendGroupText(ind + 1);
//             } else {
//               console.log(`Message failed with error: ${responseData.messages[0]['error-text']}`);
//           }
//       }
//     });
//   }
// }


// schedule.scheduleJob('* 12 * * 1', function() {
//   sendGroupText(newsletterNumbers, 0);
// });

const toneParams = {
  toneInput: { 'text': sampleText.text },
  contentType: 'application/json',
  sentences: false
};

app.get('/', (req, res) => {
    res.send("This works.");
});

app.post('/newsletter', jsonParser, (req, res) => {
  newsletterNumbers.push(req.body.number);
  nexmo.message.sendSms('12044106434', req.body.number, "Welcome to MoniMango's beta texting service! You will recieve a daily message with the top 5 trending stocks on reddit.", (err, responseData) => {
    if (err) {
        console.log(err);
    } else {
        if(responseData.messages[0]['status'] === "0") {
            console.log("Message sent successfully.");
          } else {
            console.log(`Message failed with error: ${responseData.messages[0]['error-text']}`);
        }
    }
  });
  res.sendStatus(200);
});

app.get('/nexmo', (req, res) => {
  nexmo.message.sendSms('12044106434', '15877183475', "Hello from Vonage.", (err, responseData) => {
    if (err) {
        console.log(err);
        res.sendStatus(401);
    } else {
        if(responseData.messages[0]['status'] === "0") {
            console.log("Message sent successfully.");
            res.sendStatus(200);
          } else {
            console.log(`Message failed with error: ${responseData.messages[0]['error-text']}`);
            res.sendStatus(401);
        }
    }
  });
});

app.get('/reddit', (req, res) => {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Credentials': true
  });

  let stocks = {...stockData};
  let stockTitles = Object.keys(stocks);
  const subreddits = ['stocks', 'investing', 'wallstreetbets'];
  const getTopFive = (stockVals) => stockVals.sort((a, b) => b.count - a.count).slice(0, 5);

  subreddits.forEach((subreddit, index) => {
    reddit.getSubreddit(subreddit).getTop({time: 'day', limit: 250}).then(listings => {
      for (let i = 0; i < listings.length; i++) {
        if (!listings[i].title) return;
        for (let j = 0; j < stockTitles.length; j++) {
          if (listings[i].title.includes(stockTitles[j]) || listings[i].selftext.includes(stockTitles[j])) {
            stocks[stockTitles[j]] = {...stocks[stockTitles[j]]};
            stocks[stockTitles[j]].count++;
            stocks[stockTitles[j]].text += listings[i].title;
            stocks[stockTitles[j]].ticker = stockTitles[j].trim();
          }
        }
      }
      if (index === subreddits.length - 1) {
        let topFive = getTopFive(Object.values(stocks));
        // res.send(topFive);

        function formatResponse(ind) {
          let stock = topFive[ind];
          toneAnalyzer.tone({
            toneInput: { 'text': stock.text },
            contentType: 'application/json',
            sentences: false
          }).then(toneAnalysis => {
                let tone = toneAnalysis.result.document_tone.tones.sort((a, b) => b.score - a.score).length ? toneAnalysis.result.document_tone.tones.sort((a, b) => b.score - a.score)[0].tone_name : "Tentative";
                let action = '';

                stock.text = undefined;
                delete stock.text;

                if (tone == 'Joy' || tone == 'Confident') action = 'Buy';
                else if (tone == 'Sadness' || tone == 'Fear' || tone == 'Anger') action = 'Sell';
                else action = 'Hold';

                topFive[ind] = {...stock, action, tone}

                if (ind === 4) {
                  res.end(JSON.stringify(topFive));
                  return;
                }

                formatResponse(ind + 1);
              })
            .catch(err => console.log(err, ind));
        }
        
        formatResponse(0);

        stocks = {...stockData};
      }
    });
  });
});

app.get('/tone', (req, res) => {
    toneAnalyzer.tone(toneParams)
      .then(toneAnalysis => {
          res.send(toneAnalysis);
      })
      .catch(err => {
          console.log('error:', err);
      });
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));