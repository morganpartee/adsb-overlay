const path = require("path");
const webpack = require("webpack");

module.exports = (env, argv) => {
  const isProduction = argv.mode === "production";

  return {
    mode: isProduction ? "production" : "development",
    entry: {
      bundle: "./src/main.js",
      demo: "./src/demo.js",
    },
    output: {
      filename: "[name].js",
      publicPath: "/dist/",
    },
    module: {
      rules: [
        {
          test: /\.js$/,
          loader: "babel-loader",
        },
      ],
    },
    devtool: isProduction ? false : "source-map",
    devServer: {
      hot: true,
    },
  };
};
