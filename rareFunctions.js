const express = require('express');
let app = express.Router();
const solrNode = require('solr-node');

const client = new solrNode({
    host: 'localhost',
    port: '8989',
    core: 'nodeAppCore',
    protocol: 'http'
});

// ADDING/UPDATING AN ENTRY
app.get('/add', (_req, res) => {
    const data = {
        website: 'nehalpatil7',
        url: 'https://nehalpatil7.github.io',
        author: "Nehal Patil",
        age: 21,
        marital_status: 'single'
    }
    client.update(data, function (err, _res) {
        if (err) {
            console.log("Error updating document");
        } else {
            console.log("Successfully updated document");
        }
    });
    res.status(201).send("Entry added");
});

// DELETING AN ENTRY
app.get('/delete', (_req, res) => {
    var objQuery = { age: 21 };
    client.delete(objQuery, function (err, result) {
        if (err) {
            console.log(err);
            return;
        }
        console.log('Response:', result.responseHeader);
    });
    res.status(200).send("Entry deleted");
});

module.exports = app;