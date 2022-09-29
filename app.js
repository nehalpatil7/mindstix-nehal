//BITBUCKET - git repo password : 5MQ9pwcUSpQEUz4225Yr
const express = require('express');
const http = require('http');
const fs = require('fs');
const morgan = require('morgan')
const path = require('path');
const cookieParser = require('cookie-parser');
const usersRouter = require('./routes/users');
const { MongoClient } = require('mongodb');
const solrNode = require('solr-node');
const axios = require('axios').default;
// const contentstack = require('contentstack');
// const contentstackManagement = require('@contentstack/management');
const logger = require('./utils/logger');
const routes = require('./rareFunctions');
require("isomorphic-fetch");
var cron = require('cron');
// var ncron = require('node-cron');
// const { jsonToHtml } = require('@contentstack/json-rte-serializer');
const fileUpload = require('express-fileupload');
const {
    BlobServiceClient,
    StorageSharedKeyCredential,
    SASProtocol,
    generateBlobSASQueryParameters,
    BlobSASPermissions,
} = require('@azure/storage-blob');
require('dotenv').config()


const app = express();
const host = 'localhost';
const port = process.env.port || 500;

const getActualRequestDurationInMilliseconds = start => {
    const NS_PER_SEC = 1e9; //  convert to nanoseconds
    const NS_TO_MS = 1e6; // convert to milliseconds
    const diff = process.hrtime(start);
    return (diff[0] * NS_PER_SEC + diff[1]) / NS_TO_MS;
};

let demoLogger = (req, res, next) => { //middleware function
    let current_datetime = new Date();
    let formatted_date =
        current_datetime.getFullYear() +
        "-" +
        (current_datetime.getMonth() + 1) +
        "-" +
        current_datetime.getDate() +
        " " +
        current_datetime.getHours() +
        ":" +
        current_datetime.getMinutes() +
        ":" +
        current_datetime.getSeconds();
    let method = req.method;
    let url = req.url;
    let status = res.statusCode;
    const start = process.hrtime();
    const durationInMilliseconds = getActualRequestDurationInMilliseconds(start);
    let log = `[${formatted_date}] ${method}:${url} ${status} ${durationInMilliseconds.toLocaleString()} ms`;
    console.log(log);
    next();
};

app.use(demoLogger);
app.use(fileUpload());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use('/rareFunctions', routes);

//mongo db connection setup
const uri = 'mongodb+srv://' +
    process.env.mongo_Atlas_username + ':' +
    process.env.mongo_Atlas_Password +
    '@mongodbnodejs.fehzr.mongodb.net/' +
    process.env.mongo_Atlas_dbname +
    '?retryWrites=true&w=majority';
const connectionParams = {
    useNewUrlParser: true,
    useUnifiedTopology: true
}

//content-stack setup ; Initialize the CS Content Delivery API
// const test_stack = contentstack.Stack(
//     process.env.stack_api_key,
//     process.env.stack_delivery_token,
//     process.env.stack_environment
// );

//content-stack setup ; Initialize the CS Content Management API
// let contentstackClient = contentstackManagement.client({
//     authtoken: 'bltc4006163ff555e04'
// });

//routing setup
app.use('/user', usersRouter);

//logging setup
var accessLogStream = fs.createWriteStream(path.join('./logs/access.log'), { flags: 'a' });
app.use(morgan('combined', { stream: accessLogStream }));

// view engine setup
app.set('views', [path.join(__dirname, 'views'),
path.join(__dirname, '/views')
]);
app.engine('html', require('ejs').renderFile);
app.set('view engine', 'pug', 'ejs', 'html');

// api calls
app.get('/', (req, res) => {
    res.status(200).redirect("/form-with-post");
    logger.info(`Server responsed with no resouces & request query = ${JSON.stringify(req.query)} to Ip-${req.ip}`);
});

app.post('/?', (req, res) => {
    if (req.query.name == "Nehal" && req.query.pwd == "12345") {
        res.status(200).send('User Authorized !');
        logger.info(`Server responsed with no resouces but user authorized & request query = ${JSON.stringify(req.query)} to Ip-${req.ip}`);
    } else {
        // res.status(401).send('Username & Password Both Required');
        res.status(401).send("User Unauthorized");
        logger.info(`Server responsed with no resouces but user unauthorized & request query = ${JSON.stringify(req.query)} to Ip-${req.ip}`);
    }
});

//app start/landing page
app.get('/form-with-post', (req, res) => {
    logger.info(`Server responsed with no resouces but user authorized & request query = ${JSON.stringify(req.query)} to Ip-${req.socket.remoteAddress}`);
    // let forwarded = req.headers['x-forwarded-for']
    //let ip = forwarded ? forwarded.split(/, /)[0] : req.connection.remoteAddress;
    console.log(req.connection.remoteAddress);
    //console.log(ip);
    res.status(200).render('form-with-post');
});

//Amway TW special PLP demo page for testing
app.get('/special-plp-demo', (req, res) => {
    logger.info(`Server responsed with no resouces but user authorized & request query = ${JSON.stringify(req.query)} to Ip-${req.socket.remoteAddress}`);
    test_stack
        .ContentType("special_plp_test")
        .Entry("bltea1ca99da4bd1f28")
        .language('zh-tw')
        .fetch()
        .then(function (result) {
            // console.log(result.toJSON().plp_details);
            res.status(200).send(result.toJSON().plp_details);
        }, function (error) {
            res.status(200).send(error);
        });
});

//post landing page for routes
app.post('/success', (req, res) => {
    res.status(200).render(`success`, {
        data: req.body
    });
    logger.info(`/success rendered to IP-${req.socket.remoteAddress}`);
});

//TapPay payment pages for prime
app.get('/direct_pay', (req, res) => {
    logger.info(`Server responsed with payment center page, user authorized & request query = ${JSON.stringify(req.query)} to Ip-${req.socket.remoteAddress}`);
    res.status(200).render(__dirname + '/views/direct-pay.html', {
        data: req.query.arrayInput
    });
});

app.get('/ccv_pay', (req, res) => {
    logger.info(`Server responsed with payment center page, user authorized & request query = ${JSON.stringify(req.query)} to Ip-${req.socket.remoteAddress}`);
    res.status(200).render(__dirname + '/views/ccvPrime.html', {
        data: req.query.arrayInput
    });
});

app.get('/get-prime', async (_req, res) => {
    console.log("[getPrimeAPI]");
    const prime_url = "https://js.tappaysdk.com/tpdirect/sandbox/getprime";

    const primeRequest = {
        cardnumber: "4242424242424242",
        cardduedate: "202301",
        cardcvv: "123",
        appid: "11327",
        appkey: "app_whdEWBH8e8Lzy4N6BysVRRMILYORF6UxXbiOFsICkz0J9j1C0JUlCHv1tVJC",
        appname: "localhost",
        appurl: "http://localhost:5000",
        port: "5000",
        protocol: "http",
        tappay_sdk_version: "v5.7.0",
    };

    console.log(
        `[getPrimeAPI]\nURL:\n${prime_url}\nRequest:\n${JSON.stringify(primeRequest)}`
    );

    const httpResp = await fetch(prime_url, {
        method: "POST",
        body: JSON.stringify(primeRequest),
        headers: {
            authority: "js.tappaysdk.com",
            method: "POST",
            path: "/tpdirect/sandbox/getprime",
            origin: "https://js.tappaysdk.com",
            referrer: "https://js.tappaysdk.com/tpdirect/v5.7.0/api/html?%7B%22appKey%22%3A%22app_whdEWBH8e8Lzy4N6BysVRRMILYORF6UxXbiOFsICkz0J9j1C0JUlCHv1tVJC%22%2C%22appID%22%3A11327%2C%22serverType%22%3A%22sandbox%22%2C%22hostname%22%3A%22localhost%22%2C%22origin%22%3A%22http%3A%2F%2Flocalhost%3A5000%22%2C%22referrer%22%3A%22http%3A%2F%2Flocalhost%3A5000%2Fsuccess%22%2C%22href%22%3A%22http%3A%2F%2Flocalhost%3A5000%2Fdirect_pay%3FarrayInput%3DNEHAL%2Bfrom%2BTAIWAN%26send%3DDirect%2BPay%22%2C%22port%22%3A%225000%22%2C%22protocol%22%3A%22http%3A%22%2C%22sdk_version%22%3A%22v5.7.0%22%7D",
            ContentType: "application/x-www-form-urlencoded",
            "x-api-key": "app_whdEWBH8e8Lzy4N6BysVRRMILYORF6UxXbiOFsICkz0J9j1C0JUlCHv1tVJC",
        },
    });
    const response = JSON.stringify(httpResp);
    console.log(`[getPrimeAPI] >> Response:\n${JSON.stringify(response)}`);
    console.log(httpResp);
    console.log(response);
    res.status(200).json(response);
});

app.get('/google_pay', (req, res) => {
    logger.info(`Server responsed with payment center page, user authorized & request query = ${JSON.stringify(req.query)} to Ip-${req.socket.remoteAddress}`);
    res.status(200).sendFile(__dirname + '/views/google-pay.html', {
        data: req.query.arrayInput
    });
});

app.get('/apple_pay', (req, res) => {
    logger.info(`Server responsed with payment center page, user authorized & request query = ${JSON.stringify(req.query)} to Ip-${req.socket.remoteAddress}`);
    res.status(200).sendFile(__dirname + '/views/apple-pay.html', {
        data: req.query.arrayInput
    });
});

//demo page for displaying crom result
app.get('/cron-demo', async (req, res) => {
    var secs = 0;
    var interval = 5;
    var task = cron.job(`*/${interval} * * * * *`, () => {
        console.log(secs, ' seconds elapsed');
        secs += 2;
        if (secs > 5) {
            task.stop();
            console.log("task stopped");
            res.status(201).render(`cron`, {
                data: secs
            });
        }
    });
    task.start();
    logger.info(`/Cron Success Result rendered to IP-${req.socket.remoteAddress}`);
});

//Post Login page
app.get('/loginSuccess', async (req, res) => {
    const client = new MongoClient(uri, connectionParams);
    var user = 'nehal@gmail.com';
    var pwd = '1234';
    try {
        if (req.query.email == user && req.query.psw == pwd) {
            test_stack
                .ContentType(process.env.content_type_uid)
                .Entry(process.env.entry_uid)
                .language(process.env.lang)
                .fetch()
                .then(function (result) {
                    return res.status(200).render('loginSuccess', {
                        "logged_in_username": req.query.email,
                        "fetched_content": result.toJSON()
                    });
                })
                .catch(function (error) {
                    res.json(`<h1>"Error Occurred \n"<h1>, ${error}`);
                });
        } else {
            return res.status(501).send(`<h1> Invalid Credentials </h1>`);
        }
        // client.connect(() => {
        //     const collection = client.db("MongoDbNodeJS")
        //         .collection("MongoDbNodeJS");
        //     collection.findOne({ name: req.query.email }).then((values) => {
        //         if (values && (values.pwd == req.query.psw)) {
        //             test_stack
        //                 .ContentType(process.env.content_type_uid)
        //                 .Entry(process.env.entry_uid)
        //                 .language(process.env.lang)
        //                 .fetch()
        //                 .then(function(result) {
        //                     logger.info(`/loginSuccess rendered to IP-${req.socket.remoteAddress}`);
        //                     return res.status(200).render('loginSuccess', {
        //                         "logged_in_username": req.query.email,
        //                         "fetched_content": result.toJSON()
        //                     });
        //                 })
        //                 .catch(function(error) {
        //                     logger.info(`/loginSuccess not rendered to IP-${req.socket.remoteAddress}`);
        //                     res.json(`<h1>"Error Occurred \n"<h1>, ${error}`);
        //                 });
        //         } else {
        //             logger.info(`/loginSuccess not rendered & user unauthorized to IP-${req.socket.remoteAddress}`);
        //             return res.status(500)
        //                 .send(`<h1> Incorrect Password for ${req.query.email}</h1>`);
        //         }
        //     });
        // });
    } catch (error) {
        logger.info(`/loginSuccess not rendered & user unauthorized to IP-${req.socket.remoteAddress}`);
        return res.status(500).send(`<h1>User Unauthorized</h1>`);
    } finally {
        await client.close();
    }
});

//After login retrieving with contentStack page 
// & viewPort page for image rendering check for size 
app.get('/displayArrayValues', async (req, res) => {
    try {
        var x = req.query.arrayInput.split(',');
        for (let i = 0; i < x.length; i++) {
            x[i] = parseInt(x[i]);
        }
        let dataQuery = test_stack
            .ContentType(process.env.content_type_uid)
            .Query();
        await dataQuery.language(process.env.lang)
            .containedIn(process.env.keyword, x)
            .includeCount()
            .find()
            .then(function (result) {
                let aray = [];
                aray.push(result[1]);
                let dd = JSON.stringify(result[0]);
                let ress = JSON.parse(dd);
                if (req.query.actions == 'getValues') {
                    for (let i = 0; i < aray[0]; i++) {
                        aray.push(ress[i].title);
                        aray.push(ress[i].entry_sku);
                    }
                    res.status(200).render('displayArrayValues.ejs', { "data_list": aray });
                } else if (req.query.actions == 'viewPort') {
                    let isMobile = /iPhone|iPad|iPod|Android/i.test(req.headers['user-agent']);
                    let str_aray = []
                    str_aray.push(result[1]); //push the count of entries fetched
                    if (isMobile) {
                        //   Mobile - 780 x 780
                        for (let i = 0; i < str_aray[0]; i++) {
                            str_aray.push(String(ress[i].imagegroup[i].image1.url.url + "?height=500&width=500"));
                        }
                    } else {
                        //   PC -  1280 x 800
                        for (let i = 0; i < str_aray[0]; i++) {
                            str_aray.push(String(ress[i].imagegroup[i].image1.url.url + "?height=1200&width=700"));
                        }
                    }
                    res.status(200).render('viewPort.ejs', { "data": str_aray });
                }
            },
                function (error) {
                    logger.info(`/displayArrayValues not rendered & user unauthorized to IP-${req.socket.remoteAddress} with error-${error}`);
                    return res.status(500).send(`<h1>ERROR occured</h1>`);
                })
    } catch (err) {
        logger.info(`/displayArrayValues not rendered & user unauthorized to IP-${req.socket.remoteAddress} with error-${err}`);
        return res.status(500).send(`<h1>ERROR occured</h1>`);
    }
});

//JSON RTE parser check
app.get('/getJsonRTE', async (req, res) => {
    try {
        test_stack
            .ContentType(process.env.content_type_uid)
            .Query()
            .language(process.env.lang)
            .where(process.env.keyword, 8888)
            .toJSON()
            .find()
            .then(function success(entries) {
                res.send(entries[0][0].html_example[0]);
            });
    } catch (err) {
        logger.info(` / getJsonRTE not rendered & user unauthorized to IP - ${req.socket.remoteAddress}with error - ${err}`);
        return res.status(500).send(`<h1> ERROR occured </h1>`);
    }
});

//Content Management API check
app.get('/CMA', async (req, res) => {
    try {
        contentstackClient.stack({ api_key: process.env.stack_api_key })
            .contentType('product_sku')
            .entry()
            .query({ query: { item_id: '3508', locale: 'zh-tw' } })
            .find()
            .then((entry) => {
                let ent = {
                    "entry": {
                        "title": {
                            "UPDATE": {
                                "index": 0,
                                "data": "PDP > Item ID > 3508 > changed again at 6:38 pm, 14 Oct 2021"
                            }
                        }
                    }
                }
                entry.items[0].title = 'PDP > Item ID > 3508 > changed again at 6:38 pm, 14 Oct 2021';
                delete entry.items[0].gallery
                delete entry.items[0].variants
                res.send(entry.items[0]);
                return ent.update();
            })

    } catch (err) {
        logger.info(` / CMA not rendered & user unauthorized to IP - ${req.socket.remoteAddress}with error - ${err}`);
        return res.status(500).send(`<h1> ERROR occured </h1>`);
    }
});

//Post SignUp page
app.get('/signupSuccess', async (req, res) => {
    const uri = 'mongodb+srv://' +
        process.env.mongo_Atlas_username + ':' +
        process.env.mongo_Atlas_Password +
        '@mongodbnodejs.fehzr.mongodb.net/' +
        process.env.mongo_Atlas_dbname +
        '?retryWrites=true&w=majority';
    const connectionParams = {
        useNewUrlParser: true,
        useUnifiedTopology: true
    }
    const client = new MongoClient(uri, connectionParams);
    try {
        client.connect(() => {
            const collection = client.db("MongoDbNodeJS")
                .collection("MongoDbNodeJS");
            collection.findOne({ name: req.query.email }).then((values) => {
                if (values) {
                    logger.info(`/signupSuccess not rendered & user already existed at IP-${req.socket.remoteAddress} with email-${req.query.email}`);
                    return res.status(201).render('signupFailure', {
                        "data": req.query.email
                    });
                } else {
                    if (req.query.psw != req.query.psw_repeat) {
                        res.status(500).send(`<h1>Sorry - - ${req.query.email} - - Please enter the same password again.</h1>`);
                    } else {
                        // perform actions on the collection raw_file & 
                        //inserts the username/pass into mongoDB
                        const doc = { name: req.query.email, pwd: req.query.psw };
                        const result = collection.insertOne(doc);
                        console.log(`A document was inserted with the result: ${result}`);
                        logger.info(`/signupSuccess rendered & new user created at IP-${req.socket.remoteAddress}`);
                        return res.status(201).render('signupSuccess', {
                            data: req.query.email
                        });
                    }
                }
            });
        });
    } catch (error) {
        logger.info(`/signupSuccess not rendered & user unauthorized to IP-${req.socket.remoteAddress} with error-${error}`);
        return res.status(401).render('signupFailure', {
            data: req.query
        });
    } finally {
        await client.close();
    }
});

const client = new solrNode({
    host: 'localhost',
    port: '8989',
    core: 'nodeAppCore',
    protocol: 'http'
});
require('log4js').getLogger('solr-node').level = 'DEBUG';

app.get('/searchHome', async (_req, res) => {
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>  [SearchHome rendered]");
    res.status(200).render(__dirname + '/views/searchHome.html');
});

app.get('/searchSuggest', async (_req, res) => {
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>  [SearchSuggest rendered]");
    res.status(200).render(__dirname + '/views/searchSuggest.html');
});

app.get('/searchCloud', async (_req, res) => {
    console.log(">>>>>>>>>>>>>>>>>>>>>>>>>>  [SearchCloud rendered]");
    res.status(200).render(__dirname + '/views/searchCloud.html');
});

app.get('/search?', async (req, res) => {
    const url = "http://localhost:8989/solr/nodeAppCore2/query";
    let key = "Title";
    let val = req.query.val;

    const query = {
        "q": `${key}:${val}`
    };

    console.log(query);
    await axios({
        method: 'get',
        url: url,
        headers: {},
        data: query
    })
        .then(function (response) {
            // console.log(response?.data?.response?.docs);
            res.status(200).send({
                key,
                val,
                "total": 10,
                "data": response?.data?.response?.docs
            });
        })
        .catch(function (error) {
            console.log("error");
            res.status(200).render(__dirname + '/views/searchFail.html', error);
        })
        .then(function () {
            console.log("inside Finally block, APi call success");
        });
});

app.get('/testingQuery', async (_req, res) => {
    const obj2 = [
        {
            "quantity": 7,
            "combineNumber": 1,
            "lineNumber": "2627",
            "skuCode": " 299470   ",
            "itemCode": "2785",
            "skuName": "營養飲品香草－七月小組用",
            "imgUrl": null,
            "unitPrice": 1250,
            "businessVolume": 1190,
            "pointVolume": 23.8,
            "unitPoint": 0,
            "taxRate": null,
            "labels": [
                "3E"
            ],
            "originPrice": {
                "price": 500,
                "pointValue": 28.58,
                "businessVolume": 1429,
                "giftPoint": 0
            },
            "price": {
                "price": 1250,
                "pointValue": 23.8,
                "businessVolume": 1190,
                "giftPoint": 0
            },
            "approvedStatus": 1,
            "stockStatus": 1,
            "weight": 0.1,
            "volume": null
        }
    ]
    let obj3 = []
    obj2.forEach(e => {
        if (!JSON.stringify(obj3).includes(e.itemCode)) {
            obj3.push(e);
        }
    });
    res.json(obj3);
});

async function blob_connection_setup() {
    if (!process.env.AZURE_STORAGE_CONNECTION_STRING) {
        return res.status(501).send("Azure Storage Connection failed");
    }
    return BlobServiceClient.fromConnectionString(process.env.AZURE_STORAGE_CONNECTION_STRING);
}

async function blob_exists(blob_name) {
    let blobServiceClient = await blob_connection_setup();
    return blobServiceClient.getContainerClient('mindstix-ecom-storage-container').getBlobClient(`${blob_name}`).exists();
}


const constants = {
    accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME,
    accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY
};
const sharedKeyCredential = new StorageSharedKeyCredential(
    constants.accountName,
    constants.accountKey
);


async function appendSAStoken(url, blobname) {
    let SAStoken = generateBlobSASQueryParameters({
        containerName: 'mindstix-ecom-storage-container',
        blobName: blobname,
        permissions: BlobSASPermissions.parse("racwd"),
        protocol: SASProtocol.HttpsAndHttp,
        startsOn: new Date(),
        expiresOn: new Date(new Date().valueOf() + (10 * 60 * 1000))
    }, sharedKeyCredential).toString();
    return (SAStoken[0] === '?') ? (url + SAStoken) : `${url}?${SAStoken}`;
}


app.get('/list-containers', async (_req, res) => {
    let blobServiceClient = await blob_connection_setup();
    let i = 1;
    let result = {}
    for await (const container of blobServiceClient.listContainers()) {
        result[`Container ${i++}`] = container.name;
    }
    res.status(200).json(result);
});


app.get('/list-blobs', async (_req, res) => {
    let blobServiceClient = await blob_connection_setup();
    let i = 1;
    let result = {}
    let containerClient = blobServiceClient.getContainerClient('mindstix-ecom-storage-container');
    for await (const blob of containerClient.listBlobsFlat()) {
        result[`Blob ${i++}`] = blob.name;
    }
    res.status(200).json(result);
});


app.post('/upload', async (req, res) => {
    if (req.body.overwrite == 0 && await blob_exists(req.files.raw_file.name)) {
        return res.status(401).send("Blob already exists.");
    }
    else {
        let blobServiceClient = await blob_connection_setup();
        const image_extentions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'avif', 'apng'];
        let block_blob_client;
        if (image_extentions.includes(req.files.raw_file.name.split('.')[1])) {
            if (req.body.product_id) {
                block_blob_client = blobServiceClient.getContainerClient('mindstix-ecom-storage-container').getBlockBlobClient(`images/${req.body.product_id}/${req.files.raw_file.name}`);
            }
            else {
                block_blob_client = blobServiceClient.getContainerClient('mindstix-ecom-storage-container').getBlockBlobClient(`seed/images/${req.files.raw_file.name}`);
            }
        } else {
            block_blob_client = blobServiceClient.getContainerClient('mindstix-ecom-storage-container').getBlockBlobClient(`files/${req.files.raw_file.name}`);
        }
        let block_blob_upload_response = await block_blob_client.upload(req.files.raw_file.data, req.files.raw_file.size);
        res.status(201).json({ "success": "true", "requestId": block_blob_upload_response.requestId, "message": `${req.files.raw_file.name} uploaded successfully` });
    }
});


app.get('/download', async (req, res) => {
    const image_extentions = ['jpg', 'jpeg', 'png', 'gif', 'svg', 'webp', 'avif', 'apng'];
    let file_path;
    let image_ext = req.query.filename.split('.')[1];
    if (image_extentions.includes(image_ext) && req.query.product_id) {
        file_path = `images/${req.query.product_id}/${req.query.filename}`
    }
    else if (image_extentions.includes(image_ext) && req.query.product_id == '') {
        file_path = `seed/images/${req.query.filename}`
    }
    else {
        file_path = `files/${req.query.filename}`
    }
    if (!await blob_exists(file_path)) {
        return res.status(501).send("File not present");
    }
    else {
        // generate blob URL with SAS token
        let blobServiceClient = await blob_connection_setup();
        let blobClient = blobServiceClient.getContainerClient('mindstix-ecom-storage-container').getBlobClient(file_path);
        let blob_url = await appendSAStoken(blobClient.url, file_path);
        return res.status(501).json({ "success": true, "blob_url": blob_url, "expires": "10m" });
    }
});

//listening setup
app.listen(port, () => {
    console.log(`Server started on port ${port}`);
    logger.info(`Server started and running on http://${host}:${port}`);
});