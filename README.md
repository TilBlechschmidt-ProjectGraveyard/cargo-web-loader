# Rust loader for cargo-web/stdweb crates

In order to use this loader you need to install it by cloning this repository:
```
npm install --save git+https://github.com/themegatb/cargo-web-loader.git
```
and then add it to your webpack config accordingly:
```javascript
// Cargo web crate loader
{
  test: /Cargo.toml$/,
  use: {
    loader: "cargo-web-loader",
    options: {
      bin: "websocket_api_web",
      verbose: true
    }
  }
},
// WebAssembly loader. For testing purposes
{
    test: /\.wasm$/,
    loaders: ['wasm-loader']
},
```
Finally you can import/require any Cargo.toml file and use it as documented in the [cargo-web](https://github.com/koute/cargo-web) project.

#### Special thanks
Credit goes to dflemstr and his [rust-native-wasm-loader](https://github.com/dflemstr/rust-native-wasm-loader) which provided the groundwork for this loader.
