import request from 'request';
import fs from 'fs';
import _cliProgress from 'cli-progress';
import * as link from "linkinator";
import promptSync from "prompt-sync";
const prompt = promptSync();

const download = async (url, filename, callback) => {
    const progressBar = new _cliProgress.SingleBar({
        format: '{bar} {percentage}% | ETA: {eta}s'
    }, _cliProgress.Presets.shades_classic);

    const file = fs.createWriteStream(filename);
    let receivedBytes = 0


    request.get(url)
        .on('response', (response) => {
            if (response.statusCode !== 200) {
                return callback('Response status was ' + response.statusCode);
            }

            const totalBytes = response.headers['content-length'];
            progressBar.start(totalBytes, 0);
        })
        .on('data', (chunk) => {
            receivedBytes += chunk.length;
            progressBar.update(receivedBytes);
        })
        .pipe(file)
        .on('error', (err) => {
            fs.unlink(filename);
            progressBar.stop();
            return callback(err.message);
        });

    file.on('finish', () => {
        progressBar.stop();
        file.close(callback);
        return callback({ success: true, message: 'downloaded' });
    });

    file.on('error', (err) => {
        fs.unlink(filename);
        progressBar.stop();
        return callback(err.message);
    });
}
const getLinksFromPage = (url) => {
    const downloadPath =
        "http://server3.ftpbd.net/FTP-3/Bangla%20Collection/BANGLA/Web%20Series/Indubala%20Bhaater%20Hotel%20%28TV%20Series%202023%E2%80%93%20%29/Season%2001%20720p%20%28Bengali%29/";
    const results = await link.check({
        path: downloadPath,
        recurse: true,
    });
    let downloadableLinks = [];
    if (results.links.length === 0) {
        console.log("no downloadable links found");
    } else {
        const shouldIDownload = prompt("should i download?");
        if (shouldIDownload === "yes") {
            console.log("downloading");
        } else {
            exit();
        }
    }
    for (let link of results.links) {
        const splitted = link.url.split("/");
        if (link.url.endsWith(".mkv")) {
            downloadableLinks.push({
                url: link.url,
                name: splitted[splitted.length - 1],
            });
        }
    }
    return downloadableLinks;
}

const main = async () => {
    const url = prompt("what is the url?: \n");
    if (url) {
        const downloadableLinks = getLinksFromPage(url);
    }
}