const express = require("express");

const PORT = process.env.PORT || 4000;
const app = express();

app.get('/', (req, res) => {
    res.send("This works.");
});

app.listen(PORT, () => console.log(`Listening on port ${PORT}`));