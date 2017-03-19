/* eslint no-console: 0 */

const jsome = require('jsome');
jsome.level.show = true;

const PouchDB = require('pouchdb');

PouchDB.plugin(require('pouchdb-find'));

const db = new PouchDB('speedtest');
const DBError = require('debug')('DB:error');

db.createIndex({
    index: {
        fields: ["createdAt"]
    }
});

db.info().then(function (info) {
    jsome(info);
});

const path = require('path');
const express = require('express');
const webpack = require('webpack');
const webpackMiddleware = require('webpack-dev-middleware');
const webpackHotMiddleware = require('webpack-hot-middleware');
const config = require('./webpack.config.js');

const isDeveloping = process.env.NODE_ENV !== 'production';
const port = isDeveloping ? 3000 : process.env.PORT ? process.env.PORT : 3000;
const app = express();
const io = require('socket.io')();
const ioDebug = require('debug')('IO');
const ioError = require('debug')('IO:error');

const speedTest = require('speedtest-net');

try {
    const config = require('./config.json');
} catch (e) {
    console.log("No config. Ignore this shit if it works.");
}

const uuid = require('node-uuid');

const TaskError = require('debug')('Task:error');
const TaskDebug = require('debug')('Task');

const SpeedTestCLIWrapper = require('./lib/SpeedtestCLIWrapper')();

if (isDeveloping) {
    const compiler = webpack(config);
    const middleware = webpackMiddleware(compiler, {
        publicPath: config.output.publicPath,
        contentBase: 'src',
        stats: {
            colors: true,
            hash: false,
            timings: true,
            chunks: false,
            chunkModules: false,
            modules: false
        }
    });

    app.use(middleware);
    app.use(webpackHotMiddleware(compiler));
    app.get('*', function response(req, res) {
        res.write(middleware.fileSystem.readFileSync(path.join(__dirname, 'dist/index.html')));
        res.end();
    });
} else {
    app.use(express.static(__dirname + '/dist'));
    app.get('*', function response(req, res) {
        res.sendFile(path.join(__dirname, 'dist/index.html'));
    });
}

function test() {
    const id = uuid.v1();
    TaskDebug(`Start test with uuid ${id}`);
    db.put({
        _id: id,
        createdAt: new Date(),
        finished: false
    }).then(() => {
        return SpeedTestCLIWrapper.test(config.command).then(result => {
            TaskDebug(`Test (${id}) finished. Result: ${result.ping} | ${result.download} | ${result.upload} => Add to database`);
            return db.get(id).then(doc => {
                doc.download = result.download;
                doc.upload = result.upload;
                doc.ping = result.ping;
                doc.downloadBytes = result.downloadBytes;
                doc.uploadBytes = result.uploadBytes;
                doc.raw = result.raw;
                doc.finished = true;
                return db.put(doc);
            });
        }).catch(e => {
            TaskError(`Something went wrong while testing. Save to database. Error: ${e}.`);
            return db.get(id).then(doc => {
                doc.download = -1;
                doc.upload = -1;
                doc.ping = -1;
                doc.downloadBytes = -1;
                doc.uploadBytes = -1;
                doc.raw = null;
                doc.error = e;
                doc.finished = true;
            }).catch(TaskError);
        });
    }).catch(TaskError);
}
setInterval(function () {
    test();
}, config.interval || 1 * 60 * 1000);
test();
io.on('connection', function (client) {
    ioDebug(`New client with id ${client.conn.id}`);
    let changes = db.changes({
        since: 'now',
        live: true,
        include_docs: true
    });
    changes.on('change', (change) => {
        ioDebug(`Push new data to client with id ${client.conn.id}`);
        client.emit('PushData', change);
    }).on('error', (err) => {
        DBError(err);
    });
    db.allDocs({include_docs: true}).then(result => {
        client.emit('AllData', result);
    }).catch(ioError);
    client.on('disconnect', () => {
        changes.cancel();
        changes = null;
        ioDebug(`Removed listeners for client ${client.conn.id}.`);
        client = null;
    });
});

io.listen(3001);

app.listen(port, '0.0.0.0', function onStart(err) {
    if (err) {
        console.log(err);
    }
    console.info('==> 🌎 Listening on port %s. Open up http://0.0.0.0:%s/ in your browser.', port, port);
});
