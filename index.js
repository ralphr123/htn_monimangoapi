const express = require('express');
const ToneAnalyzerV3 = require('ibm-watson/tone-analyzer/v3');
const { IamAuthenticator } = require('ibm-watson/auth');
require('dotenv').config()
const snoowrap = require('snoowrap');

const PORT = process.env.PORT || 4000;
const app = express();

// Modules
const toneAnalyzer = new ToneAnalyzerV3({
  version: '2017-09-21',
  authenticator: new IamAuthenticator({
    apikey: process.env.IBMKEY,
  }),
  serviceUrl: 'https://api.us-south.tone-analyzer.watson.cloud.ibm.com/instances/265b8730-09a9-4f67-8328-a19ce9e9d4ab',
  disableSslVerification: true,
});

const snoo = new snoowrap({
  userAgent: 'moniMango',
  clientId: process.env.REDKEY,
  clientSecret: process.env.REDSECRET
});

const text = 'Team, I know that times are tough! Product '
  + 'sales have been disappointing for the past three '
  + 'quarters. We have a competitive product, but we '
  + 'need to do a better job of selling it!';

const toneParams = {
  toneInput: { 'text': text },
  contentType: 'application/json',
};

app.get('/', (req, res) => {
    res.send("This works.");
});

app.get('/tone', (req, res) => {
    toneAnalyzer.tone(toneParams)
        .then(toneAnalysis => {
            res.send(JSON.stringify(toneAnalysis, null, 2));
        })
        .catch(err => {
            console.log('error:', err);
        });
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));