const express = require('express');
const router = express.Router();

router.get('/routing-test', (req, res, next) => {
    return res.status(200).send(`<h1>All OK, ROUTING TEST SUCCESFULL</h1>`);
});

module.exports = router;