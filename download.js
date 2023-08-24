import request from 'request';
import fs from 'fs';
import _cliProgress from 'cli-progress';
import * as link from "linkinator";
import promptSync from "prompt-sync";
const prompt = promptSync();

const download = async (url, filename, callback) => {
    return new Promise((resolve, reject) => {
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
            resolve({
                success: true,
            })
        });
    
        file.on('error', (err) => {
            fs.unlink(filename);
            progressBar.stop();
            return callback(err.message);
        });
    });
}
const getLinksFromPage = async (url) => {
    const results = await link.check({
        path: url,
        recurse: true,
    });
    let downloadableLinks = [];
    for (let link of results.links) {
        const splitted = link.url.split("/");
        if (link.url.endsWith(".mkv") || link.url.endsWith(".mp4")) {
            downloadableLinks.push({
                url: link.url,
                name: splitted[splitted.length - 1],
            });
        }
    }
    return downloadableLinks;
}

const downloadMultiple = async (downloadableLinks, seriesName) => {
    let startCount = 1;
    for (let links of downloadableLinks) {
        const check = {
            link : links.url,
            name : `../${seriesName}/${links.name}`
        }
        let b = 2;
        const result = await download(links.url, `../${seriesName}/${links.name}`, () => {});
        if (result.success) {
            console.log(`downloaded ${links.name} \n`);
            console.log(`downloaded ${startCount}/${downloadableLinks.length} \n`);
            startCount++;
        } else {
            console.log(`failed to download ${links.name}`);
        }
    }
}

const main = async () => {
    const url = prompt("what is the url?: ");
    const seriesName = prompt("what is the series name?: ") || "seriesDefaultName";
    if (url) {
        const downloadableLinks = 
        await getLinksFromPage(url);
        if (downloadableLinks.length > 0) {
            const currentTime = new Date().toDateString() + "-" + new Date().toLocaleTimeString();
            const jsonContent = JSON.stringify(downloadableLinks);
            const file = await fs.createWriteStream(`./logs/${currentTime}-${seriesName}-log.json`);
            await file.write(JSON.stringify(downloadableLinks));
            const shouldIDownload = prompt(`should i download ${downloadableLinks.length} files? : `);
            if (shouldIDownload.startsWith("y")) {
                fs.mkdir(`../${seriesName}`, function(err) {
                    if (err) {
                      console.log(err)
                    } else {
                      console.log("New directory successfully created.")
                    }
                  })
                console.log(`Downloading... ${downloadableLinks.length} files}`);
                const downloadMultipleResult = await downloadMultiple(downloadableLinks, seriesName);
            } else {
                exit();
            }
        }
    }
}
main();

