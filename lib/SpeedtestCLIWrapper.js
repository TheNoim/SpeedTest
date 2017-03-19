const child_process = require('child-process-promise');
const semver = require('semver');
const json = require('json-promise');
const prettierBytes = require('prettier-bytes');

class SpeedTestCLIWrapper {
    constructor(options) {
        this.options = options || {};
        this.test = this.test.bind(this);
    }

    test(){
        const self = this;
        return child_process.exec(`${self.options.speedtest_cli_path || 'speedtest-cli'} --version`, self.options.exec_options)
            .then(result => {
                if (semver.valid(semver.clean(result.stdout.trim())) && (semver.gt(semver.clean(result.stdout.trim()), '1.0.2') || semver.eq(semver.clean(result.stdout.trim()), '1.0.2'))){
                    return Promise.resolve();
                } else {
                    return Promise.reject(`Something went wrong. Maybe you have a too old version. v1.0.2 or higher. STDOUT: ${result.stdout}`);
                }
            }).then(() => {
                return child_process.exec(`${self.options.speedtest_cli_path || 'speedtest-cli'} --json`, self.options.exec_options);
            }).then(result => {
                return new Promise((resolve, reject) => {
                    return json.parse(result.stdout.trim()).then(result => {
                        resolve({
                            download: prettierBytes(result.download * 0.125) + '/s',
                            upload: prettierBytes(result.upload * 0.125) + '/s',
                            downloadBytes: result.download * 0.125,
                            uploadBytes: result.upload * 0.125,
                            ping: result.ping,
                            raw: result
                        });
                    }).catch(e => {
                        reject(`Speedtest-cli returned a invalid json. STDOUT: ${reject.stdout} Error: ${e}`);
                    });
                });
            });
    }
}

module.exports = function (options) {
    return new SpeedTestCLIWrapper(options);
};