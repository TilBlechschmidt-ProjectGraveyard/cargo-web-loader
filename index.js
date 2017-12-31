import {execAsync} from 'async-child-process';
import fse from 'fs-extra';
import loaderUtils from 'loader-utils';
import path from 'path';
import toml from 'toml';

const defaultConfig = {
    flags: '',
    bin: false,
    release: true,
    verbose: false
};

const getCrateRoot = async function(childPath) {
    let candidate = childPath;

    while (candidate !== path.parse(candidate).root) {
        const maybeCargoFile = path.join(candidate, 'Cargo.toml');
        if (await fse.pathExists(maybeCargoFile)) {
            return candidate;
        }
        candidate = path.dirname(candidate);
    }

    return null;
};

const load = async function(self) {
    /// Retrieve the crate root
    const crateRoot = await getCrateRoot(self.resourcePath);
    if (!crateRoot) {
        throw new Error('No Cargo.toml file found.');
    }

    /// Load the options and the Cargo.toml
    const opts = Object.assign(defaultConfig, loaderUtils.getOptions(self));
    const crateConfig = toml.parse(await fse.readFile(path.join(crateRoot, 'Cargo.toml'), 'utf8'));

    /// Check if a binary name is set otherwise use the package name as the expected binary output name
    let binaryName = opts.bin ? opts.bin : crateConfig.package.name;

    if (opts.verbose) console.log("Current binary file name:", binaryName);

    /// Refactor the options to fit the cargo-web syntax
    opts.bin = opts.bin ? `--bin ${opts.bin}` : '';
    opts.release = opts.release ? '--release' : '';

    /// Execute cargo-web
    const cmd = `cargo web build --target-webasm ${opts.bin} ${opts.release} ${opts.flags}`;
    if (opts.verbose) console.log("Running cargo-web:", cmd);
    const result = await execAsync(cmd, {cwd: crateRoot});
    if (opts.verbose) console.log("Cargo log output:", result.stdout, result.stderr);

    /// Check if the output files are where they should be
    const outputDirectory = path.join(crateRoot, `./target/wasm32-unknown-unknown/${opts.release ? 'release' : 'debug'}`);
    let wasmFile = path.join(outputDirectory, `./${binaryName}.wasm`);
    let runtimeFile = path.join(outputDirectory, `./${binaryName}.js`);

    if ( !(await fse.pathExists(wasmFile) && await fse.pathExists(runtimeFile)) ) {
        throw new Error('No wasm file and/or runtime produced as build output', null);
    }

    /// Read the runtime and make it webpack-compatible
    // TODO The replace calls shouldn't be necessary but instead the runtime in the cargo-web repo should be adapted
    runtimeFile = (await fse.readFile(runtimeFile, 'utf8'))
        .replace(/fetch\((.+?)\)/g, `require('${wasmFile}')(__imports)`)
        .replace('.then( response => response.arrayBuffer() )', '')
        .replace('.then( bytes => WebAssembly.instantiate( bytes, __imports ) )', '');

    return runtimeFile;
};

module.exports = function() {
    const callback = this.async();

    load(this).then(r => callback(null, r), e => callback(e, null));
};